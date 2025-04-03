import { Probot } from "probot";
import appFn from "./index.js";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Validate required env vars
const { APP_ID, PRIVATE_KEY, WEBHOOK_SECRET } = process.env;

if (!APP_ID || !PRIVATE_KEY || !WEBHOOK_SECRET) {
  console.error("❌ Missing one or more required environment variables:");
  if (!APP_ID) console.error("→ APP_ID is missing");
  if (!PRIVATE_KEY) console.error("→ PRIVATE_KEY is missing");
  if (!WEBHOOK_SECRET) console.error("→ WEBHOOK_SECRET is missing");
  process.exit(1);
}

// Create the Probot app instance
const app = new Probot({
  appId: APP_ID,
  privateKey: PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix escaped newlines
  secret: WEBHOOK_SECRET,
});

// Load your app logic
app.load(appFn);

// Start the app
app.start();
