import { config } from "dotenv";
config();

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { processMessage } from "./langchain/langchainService.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = "8080";

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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server V0: started on 0.0.0.0:${PORT} `);
});
