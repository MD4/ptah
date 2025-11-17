import { EventEmitter } from "node:events";

import { services } from "@ptah-app/lib-shared";
import type { IUniverseDriver } from "dmx-ts";

export type DebugDriverArgs = {
  dmxSpeed?: number;
};

export class DebugDriver extends EventEmitter implements IUniverseDriver {
  private readonly _universe: Buffer;
  private readonly _interval: number;
  private _timeout: NodeJS.Timeout | undefined;

  constructor(options: DebugDriverArgs = {}) {
    super();

    this._universe = Buffer.alloc(513, 0);
    this._interval = 1000 / (options.dmxSpeed ?? 1);
    this._timeout = undefined;
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  async init(): Promise<void> {}

  close(): void {
    this.stop();
  }

  update(u: Record<number, number>, extraData: unknown): void {
    for (const c in u) {
      this._universe[c] = u[c];
    }

    this.emit("update", u, extraData);
  }

  updateAll(v: number): void {
    for (let i = 1; i <= 512; i++) {
      this._universe[i] = v;
    }
  }

  get(c: number): number {
    return this._universe[c];
  }

  logUniverse(): void {
    services.pubsub.send("system", {
      type: "dmx:debug:data",
      data: Array.from(this._universe),
    });
  }

  private start(): void {
    this.stop();
    this._timeout = setInterval(() => {
      this.logUniverse();
    }, this._interval);
  }

  private stop(): void {
    clearInterval(this._timeout);
  }
}
