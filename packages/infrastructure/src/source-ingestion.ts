import { createRequire } from "node:module";
import type { ProcessedSourceChunk } from "@agent-base/application/project-management.js";
import type { SourceLocator } from "@agent-base/domain/project.js";
import { unzip } from "fflate";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (
  data: Buffer,
  options?: Record<string, unknown>,
) => Promise<{
  text: string;
  numpages: number;
}>;

export type { ProcessedSourceChunk };

export type ChunkLocator = SourceLocator;

export interface ChunkResult {
  content: string;
  locator: SourceLocator;
  tokenCount: number;
}

export interface ExtractionLimits {
  maxOutputBytes?: number;
  maxTokensPerChunk?: number;
  overlapTokens?: number;
  maxDecompressedBytes?: number;
}

export const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

export function extractTextFromTxt(buffer: Buffer | string): {
  content: string;
} {
  const text =
    typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer);
  return { content: text };
}

type HeadingInfo = { level: number; value: string };

export function extractTextFromMarkdown(buffer: Buffer | string): {
  content: string;
} {
  const text =
    typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer);
  return { content: text };
}

export class SourceExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceExtractionError";
  }
}

export class SourceExpansionLimitError extends SourceExtractionError {
  constructor(message: string) {
    super(message);
    this.name = "SourceExpansionLimitError";
  }
}

export async function extractChunksFromPdf(
  buffer: Buffer,
  limits: ExtractionLimits = {},
): Promise<ChunkResult[]> {
  const maxOutputBytes = limits.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const maxTokens = limits.maxTokensPerChunk ?? 400;
  const overlapTokens = limits.overlapTokens ?? 60;

  const pageTexts: string[] = [];
  let totalBytes = 0;

  try {
    await pdfParse(buffer, {
      max: 0,
      pagerender: async (pageData: unknown) => {
        const page = pageData as {
          getTextContent: (opts?: unknown) => Promise<{
            items: Array<{ str?: string; hasEOL?: boolean }>;
          }>;
        };
        const textContent = await page.getTextContent({});
        let rendered = "";
        for (const item of textContent.items) {
          rendered += item.str ?? "";
          if (item.hasEOL) rendered += "\n";
        }
        rendered += "\n";
        totalBytes += Buffer.byteLength(rendered, "utf8");
        pageTexts.push(rendered);
        return rendered;
      },
    });
  } catch (error) {
    throw new SourceExtractionError(
      error instanceof Error
        ? `PDF could not be parsed: ${error.message}`
        : "PDF could not be parsed",
    );
  }

  if (totalBytes > maxOutputBytes) {
    throw new SourceExpansionLimitError(
      `PDF extracted text exceeds ${maxOutputBytes} bytes`,
    );
  }

  const trimmedPages = pageTexts.map((text) => text.trim()).filter(Boolean);
  if (trimmedPages.length === 0) {
    throw new SourceExtractionError(
      "PDF contains no extractable text (image-only or empty)",
    );
  }

  const chunks: ChunkResult[] = [];
  for (let i = 0; i < trimmedPages.length; i += 1) {
    const pageText = trimmedPages[i];
    if (!pageText) continue;
    const pageNumber = i + 1;
    const pageChunks = chunkText(pageText, maxTokens, overlapTokens);
    for (const pageChunk of pageChunks) {
      chunks.push({
        content: pageChunk.content,
        locator: { type: "page", value: String(pageNumber) },
        tokenCount: pageChunk.tokenCount,
      });
    }
  }
  return chunks;
}

export async function extractChunksFromDocx(
  buffer: Buffer,
  limits: ExtractionLimits = {},
): Promise<ChunkResult[]> {
  const maxOutputBytes = limits.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const maxDecompressedBytes =
    limits.maxDecompressedBytes ?? DEFAULT_MAX_DECOMPRESSED_BYTES;
  const maxTokens = limits.maxTokensPerChunk ?? 400;
  const overlapTokens = limits.overlapTokens ?? 60;

  validateDocxPackage(buffer, maxDecompressedBytes);
  const entries = await decompressDocx(buffer, maxDecompressedBytes);
  const documentXmlEntry = entries.get("word/document.xml");
  if (!documentXmlEntry) {
    throw new SourceExtractionError(
      "DOCX is missing the required document.xml part",
    );
  }
  const documentXml = new TextDecoder("utf-8").decode(documentXmlEntry);
  if (Buffer.byteLength(documentXml, "utf8") > maxOutputBytes) {
    throw new SourceExpansionLimitError(
      `DOCX document.xml exceeds ${maxOutputBytes} bytes`,
    );
  }

  const paragraphs = parseDocxParagraphs(documentXml);
  if (paragraphs.length === 0) {
    throw new SourceExtractionError(
      "DOCX contains no extractable paragraph text",
    );
  }

  const chunks: ChunkResult[] = [];
  for (const paragraph of paragraphs) {
    const paragraphChunks = chunkText(paragraph.text, maxTokens, overlapTokens);
    for (const paragraphChunk of paragraphChunks) {
      const locator = paragraph.headingStyle
        ? ({
            type: "heading" as const,
            value: formatHeadingLocatorValue(
              paragraph.headingStyle,
              paragraph.text,
            ),
          } satisfies SourceLocator)
        : ({
            type: "paragraph" as const,
            value: String(paragraph.index),
          } satisfies SourceLocator);
      chunks.push({
        content: paragraphChunk.content,
        locator,
        tokenCount: paragraphChunk.tokenCount,
      });
    }
  }
  return chunks;
}

function formatHeadingLocatorValue(style: string, text: string): string {
  const headingText = text.replace(/\s+/g, " ").trim();
  if (!headingText || headingText === style) return style;
  return `${style} – ${headingText}`;
}

export function validateDocxPackage(
  buffer: Buffer,
  maxDecompressedBytes = DEFAULT_MAX_DECOMPRESSED_BYTES,
): void {
  const metadata = readZipCentralDirectory(buffer);
  if (!metadata.names.has("[Content_Types].xml")) {
    throw new SourceExtractionError("DOCX is missing [Content_Types].xml");
  }
  if (!metadata.names.has("word/document.xml")) {
    throw new SourceExtractionError(
      "DOCX is missing the required document.xml part",
    );
  }
  if (metadata.totalUncompressedBytes > maxDecompressedBytes) {
    throw new SourceExpansionLimitError(
      `DOCX archive exceeds ${maxDecompressedBytes} bytes when decompressed`,
    );
  }
}

function readZipCentralDirectory(buffer: Buffer): {
  names: Set<string>;
  totalUncompressedBytes: number;
} {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new SourceExtractionError("DOCX archive could not be parsed");
  }
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) {
    throw new SourceExtractionError(
      "DOCX archive central directory is missing",
    );
  }
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (centralDirectoryOffset === 0xffffffff) {
    throw new SourceExtractionError("DOCX Zip64 archives are not supported");
  }
  const names = new Set<string>();
  let totalUncompressedBytes = 0;
  let offset = centralDirectoryOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new SourceExtractionError(
        "DOCX archive central directory is invalid",
      );
    }
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    if (uncompressedSize === 0xffffffff) {
      throw new SourceExtractionError("DOCX Zip64 entries are not supported");
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) {
      throw new SourceExtractionError(
        "DOCX archive central directory is invalid",
      );
    }
    const name = buffer.toString("utf8", nameStart, nameEnd);
    if (!name.endsWith("/")) {
      names.add(name);
      totalUncompressedBytes += uncompressedSize;
    }
    offset = nameEnd + extraLength + commentLength;
  }
  return { names, totalUncompressedBytes };
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

interface DocxParagraph {
  index: number;
  headingStyle: string | null;
  text: string;
}

async function decompressDocx(
  buffer: Buffer,
  maxDecompressedBytes: number,
): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>();
  let totalBytes = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      unzip(
        new Uint8Array(buffer),
        {
          filter: (file) => !file.name.endsWith("/"),
        },
        (err, unzipped) => {
          if (err) return reject(err);
          for (const [name, data] of Object.entries(unzipped)) {
            if (!(data instanceof Uint8Array)) continue;
            totalBytes += data.byteLength;
            if (totalBytes > maxDecompressedBytes) {
              return reject(
                new SourceExpansionLimitError(
                  `DOCX archive exceeds ${maxDecompressedBytes} bytes when decompressed`,
                ),
              );
            }
            entries.set(name, data);
          }
          resolve();
        },
      );
    });
  } catch (error) {
    if (error instanceof SourceExpansionLimitError) throw error;
    throw new SourceExtractionError(
      error instanceof Error
        ? `DOCX archive could not be parsed: ${error.message}`
        : "DOCX archive could not be parsed",
    );
  }
  return entries;
}

const DOCX_HEADING_PREFIX = "Heading";
const DOCX_STYLE_PATTERN = /<w:pStyle\s+w:val\s*=\s*"([^"]+)"\s*\/>/;
const DOCX_TEXT_RUN_PATTERN = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const DOCX_PARAGRAPH_PATTERN = /<w:p\b[\s\S]*?<\/w:p>/g;

function parseDocxParagraphs(xml: string): DocxParagraph[] {
  const paragraphs: DocxParagraph[] = [];
  const matches = xml.match(DOCX_PARAGRAPH_PATTERN);
  if (!matches) return paragraphs;
  let paragraphIndex = 0;
  for (const match of matches) {
    const styleMatch = match.match(DOCX_STYLE_PATTERN);
    const styleValue = styleMatch?.[1] ?? "";
    const headingStyle = styleValue.startsWith(DOCX_HEADING_PREFIX)
      ? styleValue
      : null;
    let text = "";
    DOCX_TEXT_RUN_PATTERN.lastIndex = 0;
    let runMatch = DOCX_TEXT_RUN_PATTERN.exec(match);
    while (runMatch !== null) {
      text += runMatch[1] ?? "";
      runMatch = DOCX_TEXT_RUN_PATTERN.exec(match);
    }
    text = decodeXmlEntities(text).trim();
    if (!text) continue;
    paragraphIndex += 1;
    paragraphs.push({
      index: paragraphIndex,
      headingStyle:
        headingStyle !== null && headingStyle.length > 0 ? headingStyle : null,
      text,
    });
  }
  return paragraphs;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function chunkText(
  text: string,
  maxTokens: number = 400,
  overlapTokens: number = 60,
): ChunkResult[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: ChunkResult[] = [];
  let buffer = "";
  let bufferTokens = 0;
  let paragraphIndex = 0;
  let currentHeading: HeadingInfo | undefined;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const marker = headingMatch[1];
      const value = headingMatch[2];
      if (!marker || !value) continue;
      currentHeading = {
        level: marker.length,
        value: value.trim(),
      };
    }
    const paraTokens = estimateTokens(trimmed);
    if (bufferTokens + paraTokens > maxTokens && bufferTokens > 0) {
      chunks.push({
        content: buffer.trim(),
        locator: currentHeading
          ? { type: "heading" as const, value: currentHeading.value }
          : { type: "paragraph" as const, value: String(paragraphIndex + 1) },
        tokenCount: bufferTokens,
      });
      const overlap = takeLastTokens(buffer, overlapTokens);
      buffer = overlap;
      bufferTokens = estimateTokens(overlap);
      currentHeading = undefined;
      paragraphIndex++;
    }
    buffer += (buffer ? "\n\n" : "") + trimmed;
    bufferTokens += paraTokens;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      content: buffer.trim(),
      locator: currentHeading
        ? { type: "heading" as const, value: currentHeading.value }
        : { type: "paragraph" as const, value: String(paragraphIndex + 1) },
      tokenCount: bufferTokens,
    });
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function takeLastTokens(text: string, tokenCount: number): string {
  const approxChars = tokenCount * 4;
  if (text.length <= approxChars) return text;
  const lastNewline = text.lastIndexOf("\n", text.length - approxChars);
  const start = lastNewline > 0 ? lastNewline : text.length - approxChars;
  return text.slice(start).trim();
}
