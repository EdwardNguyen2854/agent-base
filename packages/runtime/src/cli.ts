#!/usr/bin/env node
import { AgentBaseRuntime } from "./agent-base-runtime.js";

const runtime = new AgentBaseRuntime();
const command = process.argv[2];

switch (command) {
  case "initialize":
    await runtime.initialize();
    console.log("Agent Base initialized.");
    break;
  case "start":
    console.log(JSON.stringify(await runtime.start(), null, 2));
    break;
  case "health":
    console.log(JSON.stringify(await runtime.health(), null, 2));
    break;
  case "stop":
    await runtime.stop();
    console.log("Agent Base stopped.");
    break;
  default:
    console.error("Usage: agent-base <initialize|start|health|stop>");
    process.exitCode = 2;
}
