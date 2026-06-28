import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateUploadBytes } from "./route";

const docxFixture = readFileSync(
  "packages/infrastructure/test/fixtures/text-with-headings.docx",
);

describe("validateUploadBytes", () => {
  it("accepts uploads whose bytes match their supported container signatures", () => {
    expect(
      validateUploadBytes("brief.pdf", Buffer.from("%PDF-1.7")),
    ).toBeUndefined();
    expect(validateUploadBytes("brief.docx", docxFixture)).toBeUndefined();
  });

  it("rejects PDF and DOCX uploads whose bytes do not match the extension", () => {
    expect(validateUploadBytes("brief.pdf", Buffer.from("hello"))).toMatch(
      /pdf file signature/i,
    );
    expect(validateUploadBytes("brief.docx", Buffer.from("hello"))).toMatch(
      /docx archive signature/i,
    );
  });

  it("does not inspect plain text source bytes", () => {
    expect(
      validateUploadBytes("notes.txt", Buffer.from("hello")),
    ).toBeUndefined();
    expect(
      validateUploadBytes("notes.md", Buffer.from("# hello")),
    ).toBeUndefined();
  });

  it("rejects binary content for text source extensions", () => {
    expect(validateUploadBytes("notes.txt", Buffer.from([0, 1, 2]))).toMatch(
      /valid UTF-8/i,
    );
  });
});
