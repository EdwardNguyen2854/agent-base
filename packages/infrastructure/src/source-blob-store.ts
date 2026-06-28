import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SourceBlobStore } from "@agent-base/application/source-ingestion.js";
import type { SourceId } from "@agent-base/domain/project.js";

export class FilesystemSourceBlobStore implements SourceBlobStore {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
    mkdirSync(this.directory, { recursive: true });
  }

  async store(sourceId: SourceId, bytes: Buffer): Promise<void> {
    const target = this.pathFor(sourceId);
    const temp = `${target}.${process.pid}.tmp`;
    writeFileSync(temp, bytes);
    renameSync(temp, target);
  }

  async load(sourceId: SourceId): Promise<Buffer> {
    const target = this.pathFor(sourceId);
    if (!existsSync(target)) {
      throw new Error(`Source blob ${sourceId} not found`);
    }
    return readFile(target);
  }

  async delete(sourceId: SourceId): Promise<void> {
    const target = this.pathFor(sourceId);
    try {
      unlinkSync(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private pathFor(sourceId: SourceId): string {
    if (!isSafeSourceId(sourceId)) {
      throw new Error(`Refusing to use unsafe Source id: ${sourceId}`);
    }
    return path.join(this.directory, sourceId);
  }
}

const SAFE_SOURCE_ID = /^[0-9a-fA-F-]+$/u;

function isSafeSourceId(sourceId: SourceId): boolean {
  if (sourceId.length === 0 || sourceId.length > 128) return false;
  return SAFE_SOURCE_ID.test(sourceId);
}

export function resetBlobStoreDirectory(dataDirectory: string): void {
  rmSync(path.join(path.resolve(dataDirectory), "sources"), {
    recursive: true,
    force: true,
  });
}
