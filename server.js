import { Probot } from "probot";
import appFn from "./index.js";
import * as dotenv from "dotenv";
import http from "http";

// Load .env
dotenv.config();

// Ensure all env vars exist
if (!process.env.APP_ID || !process.env.PRIVATE_KEY || !process.env.WEBHOOK_SECRET) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  secret: process.env.WEBHOOK_SECRET,
});

// Load your app
await probot.load(appFn);

// Create HTTP server and wrap webhook middleware in try/catch for better error visibility
const server = http.createServer((req, res) => {
  try {
    console.log("📡 Incoming request:", req.method, req.url);
    probot.webhooks.middleware(req, res);
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

// Listen on Heroku's default port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
