import { Probot, createNodeMiddleware } from 'probot';
import { myApp } from './index.js';
import dotenv from 'dotenv';
import http from 'http';
import pkg from 'smee-client';

const { SmeeClient } = pkg;

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

// Create a Probot instance
const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET,
});

console.log('🧪 Type of myApp before load:', typeof myApp);
console.dir(myApp);

// Load your app
await probot.load(myApp);

// Optionally connect Smee (for local dev or webhook proxying)
if (process.env.WEBHOOK_PROXY_URL) {
  const smee = new SmeeClient({
    source: process.env.WEBHOOK_PROXY_URL,
    target: 'http://localhost:' + (process.env.PORT || 3000) + '/',
    logger: console,
  });

  smee.start();
}

// Start HTTP server
const middleware = createNodeMiddleware(probot);
const server = http.createServer(middleware);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
