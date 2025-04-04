import { Probot } from 'probot';
import dotenv from 'dotenv';
import http from 'http';
import { createNodeMiddleware } from 'probot';
import { probotApp } from './index.js';

// Load environment variables
dotenv.config();

// Function to start the server
async function startServer() {
  try {
    // Check required environment variables
    if (
      !process.env.APP_ID ||
      !process.env.PRIVATE_KEY ||
      !process.env.WEBHOOK_SECRET
    ) {
      console.error('❌ Missing required environment variables.');
      process.exit(1);
    }

    // Initialize Probot
    const probot = new Probot({
      appId: process.env.APP_ID,
      privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
      secret: process.env.WEBHOOK_SECRET,
    });

    // Important: The correct way to apply the app with ESM modules
    probot.load((app) => probotApp(app));
    console.log('✅ App loaded successfully');

    // Create middleware
    const middleware = createNodeMiddleware(probot);

    // Create server
    const server = http.createServer(middleware);
    const PORT = process.env.PORT || 3000;

    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`✅ Probot server listening on port ${PORT}`);
    });

    // Set up local development webhook forwarding if needed
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.WEBHOOK_PROXY_URL
    ) {
      try {
        const { SmeeClient } = await import('smee-client');
        const smee = new SmeeClient({
          source: process.env.WEBHOOK_PROXY_URL,
          target: `http://localhost:${PORT}/`,
          logger: console,
        });
        smee.start();
        console.log('🔄 Smee webhook forwarding started');
      } catch (error) {
        console.warn('⚠️ Could not start Smee client:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
