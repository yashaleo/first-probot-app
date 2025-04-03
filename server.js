import { Probot, createNodeMiddleware } from "probot";
import myApp from "./index.js";
import * as dotenv from "dotenv";
import http from "http";

// Load .env
dotenv.config();

// Check required env vars
if (!process.env.APP_ID || !process.env.PRIVATE_KEY || !process.env.WEBHOOK_SECRET) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

// Async wrapper to allow `await` inside
(async () => {
  const probot = new Probot({
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
    secret: process.env.WEBHOOK_SECRET,
  });

  // Load your app into Probot
  await probot.load(myApp);

  // Use proper middleware handling
  const middleware = createNodeMiddleware(probot);
  const server = http.createServer(middleware);

  server.listen(PORT, () => {
    console.log(`✅ Probot server listening on http://localhost:${PORT}`);
  });
})();
