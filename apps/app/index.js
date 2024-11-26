#!/usr/bin/env node

const services = ["bus", "api", "gateway-ws", "main", "midi"];
const uis = { admin: process.env.VITE_UI_ADMIN_PORT };

import pm2 from "pm2";
import arg from "arg";
import http from "http";

import handler from "serve-handler";

/**
 * @type {import("http").Server[]}
 */
let startedUi = [];

const startService = (service) =>
  new Promise((resolve, reject) =>
    pm2.start(
      {
        script: `./node_modules/@ptah/service-${service}/dist/index.js`,
        name: service,
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

const serveUi = ([ui, port]) =>
  new Promise((resolve, reject) => {
    const server = http
      .createServer((request, response) =>
        handler(request, response, {
          public: `./node_modules/@ptah/ui-${ui}/dist`,
          rewrites: [
            {
              source: "/**",
              destination: "/index.html",
            },
          ],
        }),
      )
      .listen(port, (err) => (err ? reject(err) : resolve(server)));
  });

const stopUi = (server) =>
  new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );

const killPm2 = () =>
  new Promise((resolve, reject) =>
    pm2.killDaemon((err) => (err ? reject(err) : resolve())),
  );

const flush = () =>
  new Promise((resolve, reject) =>
    pm2.flush("all", (err) => (err ? reject(err) : resolve())),
  );

const kill = (resolve) => async () => {
  console.log("Stopping services...");
  await Promise.all(services.map(stopService));
  console.log("All services stopped.");

  console.log("Stopping UIs...");
  await Promise.all(startedUi.map(stopUi));
  console.log("All UIs stopped.");

  console.log("Killing supervisor...");
  try {
    await killPm2();
    resolve();
    console.log("Supervisor killed.");
  } catch (err) {
    console.log(`Supervisor kill error:\n${err}`);
  }
};

const watchSigs = () =>
  new Promise((resolve) => {
    process.on("SIGINT", kill(resolve));
    process.on("SIGTERM", kill(resolve));
  });

const start = (noUi) =>
  new Promise((resolve, reject) => {
    pm2.connect(true, async (err) => {
      if (err) {
        return reject(err);
      }

      await Promise.all(services.map(startService));

      if (!noUi) {
        startedUi = await Promise.all(Object.entries(uis).map(serveUi));
      }

      resolve();
    });
  });

const parseArgv = () => {
  try {
    return arg({ "--no-ui": Boolean });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const main = async () => {
  const args = parseArgv();
  const noUi = args["--no-ui"];

  console.log("Flushing logs...");
  await flush();
  console.log("Logs flushed.");

  console.log("Starting processes...");
  try {
    await start(noUi);
    console.log("All processes started.");
  } catch (err) {
    console.log(`Start error:\n${err}`);
    process.exit(1);
  }

  console.log("Watching for signals...");
  await watchSigs();
  console.log("Watching for signals ended.");

  process.exit(0);
};

await main();
