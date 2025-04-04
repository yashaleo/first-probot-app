const { Probot } = require('probot');
const http = require('http');
require('dotenv').config();

// Explicitly load the app handler function
const probotApp = require('./index.js');

// Function to start the server
async function startServer() {
  try {
    console.log('Starting server initialization...');

    // Create Probot instance
    const probot = new Probot({
      appId: process.env.APP_ID,
      privateKey: (process.env.PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      secret: process.env.WEBHOOK_SECRET,
    });

    console.log(`App function type: ${typeof probotApp}`);
    console.log(
      `App function content: ${probotApp.toString().slice(0, 100)}...`
    );

    try {
      // Load the app explicitly
      probot.load(probotApp);
      console.log('✅ App loaded successfully');
    } catch (loadError) {
      console.error('❌ Error loading app:', loadError);
      throw loadError;
    }

    // Instead of using the middleware, let's create a manual request handler
    const server = http.createServer(async (req, res) => {
      console.log(`📥 Incoming request: ${req.method} ${req.url}`);

      if (req.method === 'POST') {
        const buffers = [];

        req.on('data', (chunk) => {
          buffers.push(chunk);
        });

        req.on('end', async () => {
          try {
            const body = Buffer.concat(buffers).toString();
            console.log(`Request body length: ${body.length} characters`);

            // For webhook verification
            res.statusCode = 200;
            res.end('Webhook received');

            // We don't process the webhook here since we're just trying to get the server running
            console.log('Webhook acknowledged');
          } catch (webhookError) {
            console.error('Error processing webhook:', webhookError);
            res.statusCode = 500;
            res.end('Error processing webhook');
          }
        });
      } else {
        res.statusCode = 200;
        res.end('Probot server is running');
      }
    });

    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`✅ Probot server is running on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
    });
  } catch (error) {
    console.error('Startup error:', error);
    // Keep the process running even with an error
    console.log(
      'Server initialization failed, but keeping process alive for debugging'
    );
  }
}

// Start the server with better error handling
startServer().catch((error) => {
  console.error('Fatal error:', error);
  // Keep the process running for debugging
  console.log(
    'Server initialization failed, but keeping process alive for debugging'
  );
});

// Keep the process running
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Don't exit the process
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
  // Don't exit the process
});
