import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  chunkText,
  estimateTokens,
  extractChunksFromDocx,
  extractChunksFromPdf,
  extractTextFromMarkdown,
  extractTextFromTxt,
  takeLastTokens,
} from "../src/source-ingestion.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "fixtures");

function readFixture(name: string): Buffer {
  return readFileSync(path.join(fixturesDir, name));
}

describe("extractTextFromTxt", () => {
  it("extracts text from a string buffer", () => {
    const result = extractTextFromTxt("Hello, world!");
    expect(result.content).toBe("Hello, world!");
  });

  it("extracts text from a Buffer", () => {
    const result = extractTextFromTxt(Buffer.from("Buffer content"));
    expect(result.content).toBe("Buffer content");
  });
});

describe("extractTextFromMarkdown", () => {
  it("extracts text from markdown content", () => {
    const result = extractTextFromMarkdown("# Title\n\nParagraph text.");
    expect(result.content).toContain("# Title");
    expect(result.content).toContain("Paragraph text.");
  });
});

describe("estimateTokens", () => {
  it("estimates roughly 1 token per 4 characters", () => {
    expect(estimateTokens("hello")).toBe(2);
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });
});

describe("takeLastTokens", () => {
  it("returns the full text when shorter than the token window", () => {
    expect(takeLastTokens("short", 10)).toBe("short");
  });

  it("returns the last portion of text matching the token window", () => {
    const text = "words ".repeat(100);
    const result = takeLastTokens(text, 5);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(text.length);
  });
});

describe("chunkText", () => {
  it("returns an empty array for empty text", () => {
    const chunks = chunkText("", 100, 20);
    expect(chunks).toHaveLength(0);
  });

  it("creates one chunk for short text", () => {
    const chunks = chunkText("Short paragraph.", 400, 60);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toBe("Short paragraph.");
    expect(chunks[0]?.locator.type).toBe("paragraph");
    expect(chunks[0]?.locator.value).toBe("1");
  });

  it("splits text into multiple chunks at paragraph boundaries", () => {
    const paragraph =
      "This is a paragraph with enough content to fill at least one chunk. " +
      "It goes on and on with more words and sentences to reach a reasonable length. " +
      "We need enough tokens here so that the chunking algorithm creates multiple segments.";
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("creates chunks with paragraph locators", () => {
    const text =
      "First paragraph with some content.\n\nSecond paragraph with more content.";
    const chunks = chunkText(text, 400, 60);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      expect(chunk.locator.type).toMatch(/paragraph|heading/);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });
});

describe("extractChunksFromPdf", () => {
  it("extracts text from a multi-page text PDF and tags chunks with page locators", async () => {
    const buffer = readFixture("text-multi-page.pdf");
    const chunks = await extractChunksFromPdf(buffer);
    expect(chunks.length).toBeGreaterThan(0);
    const pageNumbers = new Set(
      chunks.map((chunk) =>
        chunk.locator.type === "page" ? chunk.locator.value : null,
      ),
    );
    expect(pageNumbers.size).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.locator.type).toBe("page");
      expect(Number(chunk.locator.value)).toBeGreaterThan(0);
    }
  });

  it("rejects a malformed PDF", async () => {
    const buffer = readFixture("malformed.pdf");
    await expect(extractChunksFromPdf(buffer)).rejects.toThrow();
  });

  it("throws when the extracted text exceeds the output cap", async () => {
    const buffer = readFixture("text-multi-page.pdf");
    await expect(
      extractChunksFromPdf(buffer, { maxOutputBytes: 4 }),
    ).rejects.toThrow(/exceeds/i);
  });
});

describe("extractChunksFromDocx", () => {
  it("extracts paragraphs from a DOCX and tags headings with heading locators", async () => {
    const buffer = readFixture("text-with-headings.docx");
    const chunks = await extractChunksFromDocx(buffer);
    expect(chunks.length).toBeGreaterThan(0);
    const headingChunks = chunks.filter(
      (chunk) => chunk.locator.type === "heading",
    );
    const paragraphChunks = chunks.filter(
      (chunk) => chunk.locator.type === "paragraph",
    );
    expect(headingChunks.length).toBeGreaterThan(0);
    expect(paragraphChunks.length).toBeGreaterThan(0);
    const headingValues = headingChunks.map((c) =>
      c.locator.type === "heading" ? c.locator.value : "",
    );
    expect(headingValues.some((v) => v.startsWith("Heading"))).toBe(true);
    expect(headingValues.length).toBeGreaterThanOrEqual(2);
    expect(new Set(headingValues).size).toBe(headingValues.length);
  });

  it("rejects a malformed DOCX archive", async () => {
    const buffer = readFixture("malformed.docx");
    await expect(extractChunksFromDocx(buffer)).rejects.toThrow();
  });

  it("rejects a DOCX that expands beyond the output cap", async () => {
    const buffer = readFixture("expansion-bomb.docx");
    await expect(
      extractChunksFromDocx(buffer, { maxOutputBytes: 4096 }),
    ).rejects.toThrow(/exceeds|expansion/i);
  });

  it("rejects a DOCX that expands beyond the decompression cap", async () => {
    const buffer = readFixture("expansion-bomb.docx");
    await expect(
      extractChunksFromDocx(buffer, { maxDecompressedBytes: 1024 * 1024 }),
    ).rejects.toThrow(/expansion|decompress/i);
  });
});
