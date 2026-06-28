import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FilesystemSourceBlobStore } from "../src/source-blob-store.js";

let dataDirectory: string;
let store: FilesystemSourceBlobStore;

beforeEach(() => {
  dataDirectory = mkdtempSync(path.join(tmpdir(), "agent-base-blobs-"));
  store = new FilesystemSourceBlobStore(dataDirectory);
});

afterEach(() => {
  rmSync(dataDirectory, { recursive: true, force: true });
});

describe("FilesystemSourceBlobStore", () => {
  it("stores bytes for a source id and reads them back", async () => {
    const sourceId = "00000000-0000-4000-8000-000000000001";
    const bytes = Buffer.from("hello world", "utf-8");
    await store.store(sourceId, bytes);
    const loaded = await store.load(sourceId);
    expect(loaded.equals(bytes)).toBe(true);
  });

  it("throws when loading a missing blob", async () => {
    await expect(
      store.load("00000000-0000-4000-8000-000000000099"),
    ).rejects.toThrow(/not found/i);
  });

  it("overwrites an existing blob", async () => {
    const sourceId = "00000000-0000-4000-8000-000000000002";
    await store.store(sourceId, Buffer.from("first"));
    await store.store(sourceId, Buffer.from("second"));
    const loaded = await store.load(sourceId);
    expect(loaded.toString("utf-8")).toBe("second");
  });

  it("deletes a stored blob", async () => {
    const sourceId = "00000000-0000-4000-8000-000000000003";
    await store.store(sourceId, Buffer.from("x"));
    await store.delete(sourceId);
    await expect(store.load(sourceId)).rejects.toThrow(/not found/i);
  });

  it("ignores deletion of a missing blob", async () => {
    await expect(
      store.delete("00000000-0000-4000-8000-000000000099"),
    ).resolves.toBeUndefined();
  });
});
