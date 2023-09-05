import { config } from "dotenv";
config();

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { processMessage as processandroidAssistantMessage } from "./routes/androidAssistant/androidAssistantService.js";
import { processMessage as proccessLangchainDocsMessage } from "./routes/langchainDocs/langchainDocsService.js";

const app = express();
const server = http.createServer(app);
const PORT = "8080";

// For /androidAssistant route
const androidAssistantWss = new WebSocketServer({ noServer: true });
const langchainDocsWss = new WebSocketServer({ noServer: true });

androidAssistantWss.on("connection", (ws) => {
  console.log("Client connected to /androidAssistant");

  ws.on("message", async (message) => {
    const response = await processandroidAssistantMessage(
      message.toString("utf-8").trim()
    );
    ws.send(response || "Error processing message.");
  });

  ws.on("close", () => {
    console.log("Client disconnected from /androidAssistant");
  });
});

langchainDocsWss.on("connection", (ws) => {
  console.log("Client connected to /langchainDocs");

  ws.on("message", async (message) => {
    const response = await proccessLangchainDocsMessage(
      message.toString("utf-8").trim()
    );
    ws.send(response || "Error processing message.");
  });

  ws.on("close", () => {
    console.log("Client disconnected from /langchainDocs");
  });
});

server.on("upgrade", function upgrade(request, socket, head) {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;
  console.dir({ pathname });

  if (pathname === "/androidAssistant" || pathname === "/") {
    console.dir({ pathname, request });
    androidAssistantWss.handleUpgrade(request, socket, head, function done(ws) {
      androidAssistantWss.emit("connection", ws, request);
    });
  } else if (pathname === "/langchainDocs") {
    console.dir({ pathname, request });
    langchainDocsWss.handleUpgrade(request, socket, head, function done(ws) {
      langchainDocsWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on 0.0.0.0:${PORT}`);
});
