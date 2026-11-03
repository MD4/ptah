import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CaptureDriver } from "../drivers/capture.driver";

type Header = {
  schema: string;
  source: string;
  startedWallMs: number;
  channels: number;
  universe: number;
};

type Frame = { t: number; i: number; d: string };

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptah-capture-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const readCapture = (file: string): { header: Header; frames: Frame[] } => {
  const lines = fs.readFileSync(file, "utf8").split("\n");

  expect(lines.pop()).toBe("");

  const [header, ...frames] = lines.map((line) => JSON.parse(line));

  return { header, frames };
};

const bytes = (frame: Frame): Buffer => Buffer.from(frame.d, "base64");

describe("CaptureDriver", () => {
  it("writes the capture@1 header and one line per update", async () => {
    const file = path.join(dir, "v1.jsonl");
    const driver = new CaptureDriver(file);
    const before = Date.now();

    await driver.init();
    driver.update({ 1: 255, 3: 128 }, {});
    driver.update({ 3: 64, 512: 9 }, {});
    driver.updateAll(7);
    driver.close();

    const { header, frames } = readCapture(file);

    expect(header).toEqual({
      schema: "capture@1",
      source: "v1",
      startedWallMs: expect.any(Number),
      channels: 512,
      universe: 1,
    });
    expect(header.startedWallMs).toBeGreaterThanOrEqual(before);
    expect(header.startedWallMs).toBeLessThanOrEqual(Date.now());
    expect(Object.keys(frames[0])).toEqual(["t", "i", "d"]);
    expect(frames.map((f) => f.i)).toEqual([0, 1, 2]);

    for (const [k, f] of frames.entries()) {
      expect(f.t).toBeGreaterThanOrEqual(0);
      expect(Math.round(f.t * 1000) / 1000).toBe(f.t);
      if (k > 0) {
        expect(f.t).toBeGreaterThanOrEqual(frames[k - 1].t);
      }
      expect(bytes(f)).toHaveLength(512);
    }

    // Channels are 1-based: channel n is byte n - 1.
    const first = bytes(frames[0]);
    expect([first[0], first[1], first[2], first[511]]).toEqual([
      255, 0, 128, 0,
    ]);

    // The sparse map merges into the previous frame.
    const second = bytes(frames[1]);
    expect([second[0], second[2], second[511]]).toEqual([255, 64, 9]);
    expect(second.subarray(3, 511).every((v) => v === 0)).toBe(true);

    expect(bytes(frames[2]).every((v) => v === 7)).toBe(true);
    expect(driver.get(1)).toBe(7);
  });

  it("emits update like dmx-ts drivers and records nothing after close", async () => {
    const file = path.join(dir, "closed.jsonl");
    const driver = new CaptureDriver(file);
    const seen: unknown[] = [];

    driver.on("update", (u, extra) => seen.push([u, extra]));
    await driver.init();
    driver.update({ 2: 1 }, { from: "test" });
    driver.close();
    driver.update({ 2: 2 }, {});

    expect(seen).toEqual([
      [{ 2: 1 }, { from: "test" }],
      [{ 2: 2 }, {}],
    ]);
    expect(readCapture(file).frames).toHaveLength(1);
    expect(driver.get(2)).toBe(2);
  });

  it("has every line on disk as soon as it is recorded", async () => {
    const file = path.join(dir, "sync.jsonl");
    const driver = new CaptureDriver(file);

    await driver.init();
    driver.update({ 1: 1 }, {});
    driver.updateAll(2);

    // No close: what a process.exit() would leave behind.
    const { header, frames } = readCapture(file);
    expect(header.source).toBe("v1");
    expect(frames.map((f) => [f.i, bytes(f)[0]])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    driver.close();
  });

  it("rejects init when the file cannot be created", async () => {
    const driver = new CaptureDriver(path.join(dir, "missing", "x.jsonl"));

    await expect(driver.init()).rejects.toThrow();
  });
});
