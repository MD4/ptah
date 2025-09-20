import fs from "node:fs";
import type {
  patch as patchDomain,
  program as programDomain,
} from "@ptah/lib-domains";
import { log } from "@ptah/lib-logger";
import type { DmxStatus } from "@ptah/lib-models";
import { services } from "@ptah/lib-shared";
import { sleep } from "@ptah/lib-utils";

import type { IUniverseDriver } from "dmx-ts";
import { DMX, EnttecUSBDMXProDriver } from "dmx-ts";

import { DebugDriver } from "../drivers/debug.driver";

const LOG_CONTEXT = `${process.env.SERVICE_MAIN_NAME ?? ""}:dmx`;

const UNIVERSE_MAIN = "main";
const UNIVERSE_DEBUG = "debug";

const UNIVERSE_DMX_SPEED = 40;

const dmx = new DMX();

let mainUniverse: IUniverseDriver | undefined;
let debugUniverse: DebugDriver | undefined;

let status: DmxStatus = "disconnected";

const changeStatus = (newStatus: DmxStatus): void => {
  status = newStatus;
  notifyStatus();
};

const getSerialsPorts = (): string[] =>
  fs.readdirSync("/dev").filter((fn) => fn.startsWith("cu.usbserial"));

process.on(
  "uncaughtException",
  (error: Error & { code?: string; disconnect?: boolean }) => {
    if (error.code === "ENXIO" && error.disconnect) {
      changeStatus("disconnected");

      log(LOG_CONTEXT, "lost connection to DMX USB device!");

      void initialize();
    }
  },
);

export const notifyStatus = (): void => {
  services.pubsub.send("system", { type: `dmx:status:${status}` });
};

export const initialize = async (): Promise<void> => {
  log(LOG_CONTEXT, "connecting to DMX USB device..");

  changeStatus("connecting");

  if (!debugUniverse) {
    debugUniverse = (await dmx.addUniverse(
      UNIVERSE_DEBUG,
      new DebugDriver({ dmxSpeed: UNIVERSE_DMX_SPEED }),
    )) as DebugDriver;
  }

  let serialPorts = getSerialsPorts();
  let firstCheck = true;

  while (!serialPorts.length) {
    if (firstCheck) {
      log(LOG_CONTEXT, "waiting for a DMX USB device to be connected..");
      firstCheck = false;
    }

    serialPorts = getSerialsPorts();

    if (!serialPorts.length) {
      await sleep(200);
    }
  }

  try {
    mainUniverse = await dmx.addUniverse(
      UNIVERSE_MAIN,
      new EnttecUSBDMXProDriver(`/dev/${serialPorts[0]}`, {
        dmxSpeed: UNIVERSE_DMX_SPEED,
      }),
    );
  } catch (_) {
    await initialize();
    return;
  }

  reset();
  changeStatus("connected");

  log(LOG_CONTEXT, "DMX connected");
};

export const reset = (): void => {
  if (debugUniverse) {
    setImmediate(() => {
      dmx.updateAll(UNIVERSE_DEBUG, 0);
    });
  }
  if (mainUniverse) {
    setImmediate(() => {
      dmx.updateAll(UNIVERSE_MAIN, 0);
    });
  }
};

export const resetProgram = (mapping: patchDomain.PatchMapping): void =>
  void setImmediate(() =>
    dmx.update(
      UNIVERSE_MAIN,
      Object.values(mapping)
        .flat()
        .reduce<programDomain.ProgramOutputOuputs>(
          (acc, channel) => ({ ...acc, [channel]: 0 }),
          {},
        ),
    ),
  );

export const update = (
  programOutput: programDomain.ProgramOutputOuputs,
): void => {
  if (debugUniverse) {
    setImmediate(() => {
      dmx.update(UNIVERSE_DEBUG, programOutput);
    });
  }
  if (mainUniverse) {
    setImmediate(() => {
      dmx.update(UNIVERSE_MAIN, programOutput);
    });
  }
};

export const setDebug = (enabled: boolean): void =>
  debugUniverse?.setEnabled(enabled);
