import { Probot } from "probot";
import appFn from "./index.js";
import * as dotenv from "dotenv";
import http from "http";

// Load environment variables from .env
dotenv.config();

// Check for missing required vars
const { APP_ID, PRIVATE_KEY, WEBHOOK_SECRET, PORT = 3000 } = process.env;

if (!APP_ID || !PRIVATE_KEY || !WEBHOOK_SECRET) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

// Create the Probot instance
const probot = new Probot({
  appId: APP_ID,
  privateKey: PRIVATE_KEY.replace(/\\n/g, "\n"),
  secret: WEBHOOK_SECRET,
});

// Load your app logic
probot.load(appFn);

// Create and start the HTTP server
http.createServer(probot.webhooks.middleware).listen(PORT, () => {
  console.log(`✅ Probot server running at http://localhost:${PORT}`);
});
