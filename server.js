import { Probot, createNodeMiddleware } from 'probot';
import myApp from './index.js'; // ✅ default import
import dotenv from 'dotenv';
import http from 'http';
import pkg from 'smee-client';

const { SmeeClient } = pkg;

dotenv.config();

if (!process.env.APP_ID || !process.env.PRIVATE_KEY || !process.env.WEBHOOK_SECRET) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET,
});

console.log('🧪 Type of myApp before load:', typeof myApp);
console.log('🧪 Function string:', myApp.toString().slice(0, 100));

// Load your app correctly (default export = a function)
await probot.load(myApp);

// Start Smee for local webhook forwarding
if (process.env.WEBHOOK_PROXY_URL) {
  const smee = new SmeeClient({
    source: process.env.WEBHOOK_PROXY_URL,
    target: `http://localhost:${process.env.PORT || 3000}/`,
    logger: console,
  });
  smee.start();
}

const middleware = createNodeMiddleware(probot);
const server = http.createServer(middleware);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
