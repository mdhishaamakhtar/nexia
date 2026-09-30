import type { Logger } from "../logging/logger";

export interface StaleEmbedder {
  embedStale(limit: number): Promise<number>;
}

const BATCH_SIZE = 10;

/**
 * Runs the embedding pipeline in the background of the API process: on a
 * timer, and immediately when a save calls `wake()`. One pass at a time; a
 * wake-up during a pass schedules exactly one more.
 *
 * Nothing about a save depends on this. If the provider is down, or the
 * process restarts, stale profiles are simply picked up on a later pass.
 */
export class EmbeddingWorker {
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private rerun = false;
  private started = false;
  private stopping = false;

  constructor(
    private embedder: StaleEmbedder,
    private logger: Logger,
    private intervalMs: number
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => this.wake(), this.intervalMs);
    this.timer.unref();
    this.wake();
  }

  /** Asks for a pass soon. Never throws and never blocks the caller. */
  wake(): void {
    if (!this.started) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.running = this.drain().finally(() => {
      this.running = null;
      if (this.rerun && this.started) {
        this.rerun = false;
        this.wake();
      }
    });
  }

  /** Embeds stale profiles in batches until none are left. Errors are logged, not thrown. */
  async drain(): Promise<void> {
    try {
      let embedded: number;
      do {
        embedded = await this.embedder.embedStale(BATCH_SIZE);
      } while (embedded === BATCH_SIZE && !this.stopping);
    } catch (err) {
      this.logger.error({ err }, "embedding pass failed");
    }
  }

  /** Stops the timer and waits for a pass in flight to finish. */
  async stop(): Promise<void> {
    this.started = false;
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.running;
  }
}
