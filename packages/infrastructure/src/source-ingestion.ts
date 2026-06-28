import type { ProcessedSourceChunk } from "@agent-base/application/project-management.js";
import type { SourceLocator } from "@agent-base/domain/project.js";

export type { ProcessedSourceChunk };

export type ChunkLocator = SourceLocator;

export interface ChunkResult {
  content: string;
  locator: SourceLocator;
  tokenCount: number;
}

export function extractTextFromTxt(
  buffer: Buffer | string,
): { content: string } {
  const text =
    typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer);
  return { content: text };
}

type HeadingInfo = { level: number; value: string };

export function extractTextFromMarkdown(
  buffer: Buffer | string,
): { content: string } {
  const text =
    typeof buffer === "string" ? buffer : new TextDecoder().decode(buffer);
  return { content: text };
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
      currentHeading = {
        level: headingMatch[1]!.length,
        value: headingMatch[2]!.trim(),
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
