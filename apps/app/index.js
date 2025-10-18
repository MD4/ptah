#!/usr/bin/env node

import { ChildProcess } from "node:child_process";
import http from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as shared from "@ptah/lib-shared";
import arg from "arg";
import { config } from "dotenv";
import open from "open";
import pm2 from "pm2";
import handler from "serve-handler";

/**
 * @typedef {import("arg")} arg
 * @typedef {import("http")} http
 * @typedef {import("pm2")} pm2
 * @typedef {http.Server} Server
 */

/**
 * @type {string[]}
 */
const services = ["bus", "gateway-ws", "api", "main", "midi"];

/**
 * @type {{ [key: string]: number }}
 */
const defaultUIs = { admin: Number(process.env.VITE_UI_ADMIN_PORT) };

/**
 * @type {string}
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * @type {string}
 */
const __dirname = dirname(__filename);

/**
 * @type {Server[]}
 */
let startedUi = [];
/**
 * @type {ChildProcess[]}
 */
const openedTabs = [];

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {Record<string, string>}
 */
const toEnv = (env) =>
  Object.entries(env).reduce(
    (envs, [key, value]) => (value ? { ...envs, [key]: value } : envs),
    {},
  );

/**
 * @param {string} service
 * @returns {Promise<void>}
 */
const startService = (service) =>
  new Promise((resolve, reject) =>
    pm2.start(
      {
        script: `${__dirname}/node_modules/@ptah/service-${service}/dist/index.js`,
        name: service,
        env: toEnv(process.env),
      },
      (err) => {
        if (err) {
          console.log(` - ${service} error:\n${err}`);
          reject();
        } else {
          resolve();
        }
      },
    ),
  );

/**
 * @param {string[]} services
 * @returns {Promise<void>}
 */
const startServices = async (services) => {
  for (const service of services) {
    console.log(`Starting service ${service}...`);
    await startService(service);
    console.log(`Service ${service} started.`);
  }
};

/**
 * @param {string} service
 * @returns {Promise<void>}
 */
const stopService = (service) =>
  new Promise((resolve, reject) =>
    pm2.stop(service, (err) => {
      if (err) {
        console.log(` - ${service} kill error:\n${err}`);
        reject();
      } else {
        resolve();
      }
    }),
  );

/**
 * @param {[string, number]} ui
 * @returns {Promise<Server>}
 */
const serveUi = ([ui, port]) =>
  new Promise((resolve, reject) => {
    const server = http
      .createServer((request, response) =>
        handler(request, response, {
          public: `${__dirname}/node_modules/@ptah/ui-${ui}/dist`,
          rewrites: [
            {
              source: "/**",
              destination: "/index.html",
            },
          ],
        }),
      )
      .listen(port, () => resolve(server))
      .on("error", reject);
  });

/**
 * @param {string} ui
 * @param {number} port
 * @returns {Promise<ChildProcess>}
 */
const openUi = (ui, port) => {
  const url = `http://localhost:${port}`;
  console.log(`Opening UI ${ui} at ${url}`);
  return open(url);
};

/**
 * @param {Server} server
 * @returns {Promise<void>}
 */
const stopUi = (server) =>
  new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );

/**
 * @returns {Promise<void>}
 */
const killPm2 = () =>
  new Promise((resolve, reject) =>
    pm2.killDaemon((err) => (err ? reject(err) : resolve())),
  );

/**
 * @returns {Promise<void>}
 */
const flush = () =>
  new Promise((resolve, reject) =>
    pm2.flush("all", (err) => (err ? reject(err) : resolve())),
  );

/**
 * @param {() => void} resolve
 * @returns {() => Promise<void>}
 */
const kill = (resolve) => async () => {
  console.log("Stopping services...");
  await Promise.all(services.map(stopService));
  console.log("All services stopped.");

  console.log("Stopping UIs...");
  await Promise.all(startedUi.map(stopUi));
  console.log("All UIs stopped.");

  console.log("Closing opened tabs...");
  await Promise.all(openedTabs.map((tab) => tab.kill()));
  console.log("All opened tabs closed.");

  console.log("Killing supervisor...");
  try {
    await killPm2();
    resolve();
    console.log("Supervisor killed.");
  } catch (err) {
    console.log(`Supervisor kill error:\n${err}`);
  }
};

/**
 * @returns {Promise<void>}
 */
const watchSigs = () =>
  new Promise((resolve) => {
    process.on("SIGINT", kill(resolve));
    process.on("SIGTERM", kill(resolve));
  });

/**
 * @param {boolean} noUi
 * @param {{ [key: string]: number }} uis
 * @returns {Promise<void>}
 */
const start = (noUi, uis) =>
  new Promise((resolve, reject) => {
    pm2.connect(true, async (err) => {
      if (err) {
        return reject(err);
      }

      await startServices(services);

      if (!noUi) {
        startedUi = await Promise.all(Object.entries(uis).map(serveUi));
      }

      resolve();
    });
  });

/**
 * @returns {arg.Result<{ "--no-ui": BooleanConstructor; "--no-open": BooleanConstructor }>}
 */
const parseArgv = () => {
  try {
    return arg({ "--no-ui": Boolean, "--no-open": Boolean });
  } catch (/** @type {any} */ err) {
    console.error(err.message);
    process.exit(1);
  }
};

/**
 * @param {{ [key: string]: number }} defaultUIs
 * @param {{ appAdminPort:number}} settings
 * @returns
 */
const getUIs = (defaultUIs, settings) => {
  return {
    ...defaultUIs,
    admin: settings.appAdminPort ?? defaultUIs.admin,
  };
};

/**
 * @returns {Promise<void>}
 */
const main = async () => {
  console.log(`Loading envs from '${__dirname}/.env'`);
  config({
    path: `${__dirname}/.env`,
  });

  const args = parseArgv();
  const noUi = args["--no-ui"] ?? false;
  const noOpen = args["--no-open"] ?? false;

  const settings = await shared.services.settings.loadSettingsOrInitialize();

  const uis = getUIs(defaultUIs, settings);

  console.log("Flushing logs...");
  await flush();
  console.log("Logs flushed.");

  console.log("Starting processes...");
  try {
    await start(noUi, uis);
    console.log("All processes started.");
  } catch (err) {
    console.log(`Start error:\n${err}`);
    process.exit(1);
  }

  if (!noOpen) {
    try {
      openedTabs.push(await openUi("admin", uis.admin));
    } catch (err) {
      console.log(
        `Failed to open UI admin at http://localhost:${uis.admin}:`,
        err,
      );
      process.exit(1);
    }
  }

  console.log("Watching for signals...");
  await watchSigs();
  console.log("Watching for signals ended.");

  process.exit(0);
};

await main();
