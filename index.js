#!/usr/bin/env node

"use strict";

const { exec } = require("child_process");
const ptah = exec("pnpm start");

ptah.stdout.on("data", (data) => {
  console.log(data.trim());
});

ptah.stderr.on("data", (data) => {
  console.error(data.trim());
});

ptah.on("close", (code) => {
  console.log(`child process exited with code ${code}`);
});
