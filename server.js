import { Probot } from "probot";
import appFn from "./index.js";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const app = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix newlines in key
  secret: process.env.WEBHOOK_SECRET,
});

app.load(appFn);

// Start the app
app.start();
