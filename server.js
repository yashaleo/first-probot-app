import { Probot } from 'probot';
import { myApp } from './index.js';
import * as dotenv from 'dotenv';
import http from 'http';

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

// For Probot v13: You don’t use `createNodeMiddleware` anymore
// Instead, just handle HTTP requests manually (if needed)
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200);
    res.end('✅ Probot app is running');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server listening on http://localhost:${PORT}`);
});
