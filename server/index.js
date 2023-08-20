import { config } from "dotenv";
config();

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { processMessage } from "./langchain/langchainService.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    console.log("Received:", message.toString().trim());

    const response = await processMessage(message.toString("utf-8").trim());
    if (response) {
      ws.send(response);
    } else {
      ws.send("Error processing message.");
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(8080, () => {
  console.log("Server started on http://localhost:8080");
});
