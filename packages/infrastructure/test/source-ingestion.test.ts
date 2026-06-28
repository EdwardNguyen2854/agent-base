import { describe, expect, it } from "vitest";
import {
  chunkText,
  estimateTokens,
  extractTextFromMarkdown,
  extractTextFromTxt,
  takeLastTokens,
} from "../src/source-ingestion.js";

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
    const paragraph = "This is a paragraph with enough content to fill at least one chunk. " +
      "It goes on and on with more words and sentences to reach a reasonable length. " +
      "We need enough tokens here so that the chunking algorithm creates multiple segments.";
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("creates chunks with paragraph locators", () => {
    const text = "First paragraph with some content.\n\nSecond paragraph with more content.";
    const chunks = chunkText(text, 400, 60);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    for (const chunk of chunks) {
      expect(chunk.locator.type).toMatch(/paragraph|heading/);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });
});
