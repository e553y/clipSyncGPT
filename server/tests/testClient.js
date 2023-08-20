// testClient.js

import { WebSocket } from "ws";
import readline from "readline";

const serverURL = process.argv[2] || "ws://localhost:8080";

const ws = new WebSocket(serverURL);

ws.on("open", () => {
  console.log(`Connected to ${serverURL}`);

  // Use readline to get input from the console
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    ws.send(input);
  });
});

ws.on("message", (message) => {
  console.log(`Received from server: ${message}`);
});

ws.on("close", (code, reason) => {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
});

ws.on("error", (err) => {
  console.error("WebSocket Error:", err);
});
