import { Probot, createNodeMiddleware } from 'probot';
import { myApp } from './index.js';
import * as dotenv from 'dotenv';
import http from 'http';
import { URL } from 'url';
import { SmeeClient } from 'smee-client';

dotenv.config();

// Check required env vars
if (
  !process.env.APP_ID ||
  !process.env.PRIVATE_KEY ||
  !process.env.WEBHOOK_SECRET
) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

// Start the Probot app
const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET,
});

console.log('🧪 Type of myApp before load:', typeof myApp);
console.dir(myApp);

await probot.load(myApp);

// Setup the Smee client if in development and proxy is defined
if (process.env.WEBHOOK_PROXY_URL) {
  const smee = new SmeeClient({
    source: process.env.WEBHOOK_PROXY_URL,
    target: 'http://localhost:3000/',
    logger: console,
  });

  smee.start();
}

// This handles GitHub webhook requests
const middleware = createNodeMiddleware(probot);

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/') {
    return middleware(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
