import type { SourceId } from "@agent-base/domain/project.js";
import PgBoss from "pg-boss";

const SOURCE_INGESTION_QUEUE = "source-ingestion";
const SOURCE_INGESTION_WATCHDOG_QUEUE = "source-ingestion-watchdog";
const DEFAULT_WATCHDOG_INTERVAL_MINUTES = 1;

export class PgBossSourceIngestionQueue {
  private readonly boss: PgBoss;
  private started = false;

  constructor(databaseUrl: string) {
    this.boss = new PgBoss(databaseUrl);
  }

  async start(): Promise<void> {
    if (this.started) return;
    await this.boss.start();
    this.started = true;
  }

  async enqueue(sourceId: SourceId): Promise<void> {
    await this.start();
    await this.boss.send(
      SOURCE_INGESTION_QUEUE,
      { sourceId },
      { retryLimit: 3 },
    );
  }

  async scheduleWatchdog(
    handler: () => Promise<void>,
    options: { intervalMinutes?: number } = {},
  ): Promise<void> {
    await this.start();
    const intervalMinutes =
      options.intervalMinutes ?? DEFAULT_WATCHDOG_INTERVAL_MINUTES;
    await this.boss.schedule(
      SOURCE_INGESTION_WATCHDOG_QUEUE,
      `*/${intervalMinutes} * * * *`,
      {},
    );
    await this.boss.work<Record<string, never>>(
      SOURCE_INGESTION_WATCHDOG_QUEUE,
      { pollingIntervalSeconds: 2 },
      async () => {
        await handler();
      },
    );
  }

  async work(handler: (sourceId: SourceId) => Promise<void>): Promise<void> {
    await this.start();
    await this.boss.work<{ sourceId: SourceId }>(
      SOURCE_INGESTION_QUEUE,
      { pollingIntervalSeconds: 2 },
      async (jobs) => {
        for (const job of jobs) await handler(job.data.sourceId);
      },
    );
  }

  async close(): Promise<void> {
    if (!this.started) return;
    await this.boss.stop();
    this.started = false;
  }
}
