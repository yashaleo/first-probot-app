import { Probot } from 'probot';
import { myApp } from './index.js';
import * as dotenv from 'dotenv';
import http from 'http';
import handler from 'smee-client'; // ✅ Needed for Smee proxy webhook forwarding

dotenv.config();

// Validate required environment variables
if (
  !process.env.APP_ID ||
  !process.env.PRIVATE_KEY ||
  !process.env.WEBHOOK_SECRET
) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET,
});

console.log('🧪 Type of myApp before load:', typeof myApp);
console.dir(myApp);

// Load your app
await probot.load(myApp);

const PORT = process.env.PORT || 3000;

// 🧪 Smee webhook proxy setup for dev/Heroku
if (process.env.WEBHOOK_PROXY_URL) {
  const smee = new handler({
    source: process.env.WEBHOOK_PROXY_URL,
    target: `http://localhost:${PORT}/`,
    logger: console,
  });
  smee.start();
}

// For Probot v13: You can forward requests to probot using built-in middleware
const server = http.createServer(probot.webhooks.middleware);

server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
