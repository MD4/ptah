// @TODO: here connect & update DMX stuff

import fs from "node:fs";
import type { IUniverseDriver } from "dmx-ts";
import { DMX, EnttecUSBDMXProDriver } from "dmx-ts";
import { log } from "@ptah/lib-logger";
import type { ProgramOutput } from "../domains/program.types";
import type { PatchMapping } from "../domains/patch.domain.types";
import { sleep } from "./time";

const LOG_CONTEXT = `${process.env.SERVICE_NAME}:dmx`;
const UNIVERSE_MAIN = "main";

const dmx = new DMX();
let universe: IUniverseDriver | undefined;

const getSerialsPorts = (): string[] =>
  fs.readdirSync("/dev").filter((fn) => fn.startsWith("cu.usbserial"));

process.on(
  "uncaughtException",
  (error: Error & { code?: string; disconnect?: boolean }) => {
    if (error.code === "ENXIO" && error.disconnect) {
      log(LOG_CONTEXT, "lost connection to DMX USB device!");
      void initialize();
    }
  }
);

export const initialize = async (): Promise<void> => {
  log(LOG_CONTEXT, "connecting to DMX USB device..");

  let serialPorts = getSerialsPorts();
  let firstCheck = true;

  while (!serialPorts.length) {
    if (firstCheck) {
      log(LOG_CONTEXT, "waiting for a DMX USB device to be connected..");
      firstCheck = false;
    }

    serialPorts = getSerialsPorts();
    // eslint-disable-next-line no-await-in-loop -- because
    await sleep(500);
  }

  try {
    universe = await dmx.addUniverse(
      UNIVERSE_MAIN,
      new EnttecUSBDMXProDriver(`/dev/${serialPorts[0]}`, { dmxSpeed: 40 })
    );
  } catch (error) {
    await initialize();
    return;
  }

  reset();

  log(LOG_CONTEXT, "DMX connected");
};

export const reset = (): void => {
  if (!universe) {
    return;
  }

  dmx.updateAll(UNIVERSE_MAIN, 0);
};

export const resetProgram = (mapping: PatchMapping): void => {
  dmx.update(
    UNIVERSE_MAIN,
    mapping.reduce<ProgramOutput>((channels, channel) => {
      channels[channel] = 0;

      return channels;
    }, {})
  );
};

export const update = (programOutput: ProgramOutput): void => {
  if (!universe) {
    return;
  }

  dmx.update(UNIVERSE_MAIN, programOutput);
};
