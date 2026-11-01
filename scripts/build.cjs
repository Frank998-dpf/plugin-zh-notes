"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "src", "plugin.js");
const output = path.join(root, "main.js");

// The directory verifier removes release artifacts before invoking build.
// Keep one authoritative source and copy its exact bytes, including MIT notices.
execFileSync(process.execPath, ["--check", source], { stdio: "inherit" });
fs.copyFileSync(source, output);
