import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "..", "test", "fixtures");
mkdirSync(fixturesDir, { recursive: true });

async function writeTextDocx(
  fileName: string,
  paragraphs: Array<{ heading?: HeadingLevel; text: string }>,
): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.map((p) =>
          new Paragraph({
            children: [new TextRun(p.text)],
            heading: p.heading,
            alignment: AlignmentType.LEFT,
          }),
        ),
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(path.join(fixturesDir, fileName), buffer);
}

function writeMalformedDocx(fileName: string): void {
  writeFileSync(path.join(fixturesDir, fileName), Buffer.from("not a real docx"));
}

async function writeExpansionBombDocx(fileName: string): Promise<void> {
  // A DOCX with a single very large paragraph that exceeds our expansion cap
  const hugeText = "A".repeat(5 * 1024 * 1024);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun(hugeText)],
            alignment: AlignmentType.LEFT,
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(path.join(fixturesDir, fileName), buffer);
}

await writeTextDocx("text-with-headings.docx", [
  { heading: HeadingLevel.HEADING_1, text: "Introduction" },
  { text: "This is the opening paragraph of the document." },
  { text: "A second paragraph introduces supporting detail." },
  { heading: HeadingLevel.HEADING_2, text: "Background" },
  { text: "Background context appears here." },
  { heading: HeadingLevel.HEADING_1, text: "Conclusion" },
  { text: "The document closes with a final summary." },
]);
writeMalformedDocx("malformed.docx");
await writeExpansionBombDocx("expansion-bomb.docx");

console.log("DOCX fixtures written to", fixturesDir);
