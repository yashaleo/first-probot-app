import { Probot, createNodeMiddleware } from "probot";
import myApp from "./index.js";
import * as dotenv from "dotenv";
import http from "http";

dotenv.config();

if (!process.env.APP_ID || !process.env.PRIVATE_KEY || !process.env.WEBHOOK_SECRET) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  secret: process.env.WEBHOOK_SECRET,
});

console.log("🧪 Type of myApp before load:", typeof myApp);
console.dir(myApp);

await probot.load(myApp);

const middleware = createNodeMiddleware(probot);
const server = http.createServer(middleware);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});