#!/usr/bin/env node

const services = [
  "service-bus",
  "service-api",
  "service-gateway-ws",
  "service-main",
  "service-midi",
];

import pm2 from "pm2";

const startService = (service) =>
  new Promise((resolve, reject) =>
    pm2.start(
      {
        script: `./node_modules/@ptah/${service}/dist/index.js`,
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

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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

  console.log("Killing supervisor...");
  try {
    await killPm2();
    resolve();
    console.log("Supervisor killed.");
  } catch (err) {
    console.log(`Supervisor kill error:\n${err}`);
  }
};

const watchSigs = () => new Promise((resolve) => {
  process.on("SIGINT", kill(resolve));
  process.on("SIGTERM", kill(resolve));
});

const start = () =>  new Promise((resolve, reject) => {
  pm2.connect(true, async (err) => {
    if (err) {
      return reject(err);
    }
    
    await Promise.all(services.map(startService));
    resolve();
  });
});

const main = async () => {
  console.log("Flushing logs...");
  await flush();
  console.log("Logs flushed.");

  console.log("Starting services...");
  try {
    await start();
    console.log("All services started.");
  } catch (err) {
    console.log(`Start error:\n${err}`);
    process.exit(1);
  }

  console.log("Watching for signals...");
  await watchSigs();
  console.log("Watching for signals ended.");
};


await main();
