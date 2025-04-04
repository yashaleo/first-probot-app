const { Probot } = require('probot');
const http = require('http');
const crypto = require('crypto');
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

    try {
      // Load the app explicitly
      probot.load(probotApp);
      console.log('✅ App loaded successfully');
    } catch (loadError) {
      console.error('❌ Error loading app:', loadError);
      throw loadError;
    }

    // Create a server that manually processes GitHub webhooks
    const server = http.createServer(async (req, res) => {
      console.log(`📥 Incoming request: ${req.method} ${req.url}`);

      if (req.method === 'POST') {
        const buffers = [];

        req.on('data', (chunk) => {
          buffers.push(chunk);
        });

        req.on('end', async () => {
          try {
            const payload = Buffer.concat(buffers);
            const body = payload.toString();
            console.log(`Request body length: ${body.length} characters`);

            // Verify webhook signature
            const signature =
              req.headers['x-hub-signature-256'] ||
              req.headers['x-hub-signature'];
            const event = req.headers['x-github-event'];
            const id = req.headers['x-github-delivery'];

            if (!signature || !event || !id) {
              console.log('Missing required GitHub headers');
              res.statusCode = 400;
              res.end('Missing required GitHub headers');
              return;
            }

            // Verify the webhook signature if secret is available
            if (process.env.WEBHOOK_SECRET) {
              const sigHashAlg = signature.includes('sha256=')
                ? 'sha256'
                : 'sha1';
              const sigValuePos = signature.includes('sha256=') ? 7 : 5;
              const hmac = crypto.createHmac(
                sigHashAlg,
                process.env.WEBHOOK_SECRET
              );
              hmac.update(payload);
              const digest = `${sigHashAlg}=${hmac.digest('hex')}`;

              if (
                !crypto.timingSafeEqual(
                  Buffer.from(signature),
                  Buffer.from(digest)
                )
              ) {
                console.log('Invalid signature');
                res.statusCode = 401;
                res.end('Invalid signature');
                return;
              }
            }

            console.log(`Processing GitHub event: ${event}`);

            // Send a 200 response immediately to acknowledge receipt
            res.statusCode = 200;
            res.end('Webhook received');

            // Now process the webhook event
            try {
              // Create webhook context
              const context = {
                id,
                name: event,
                payload: JSON.parse(body),
              };

              // Emit the event to our Probot app
              await probot.receive(context);
              console.log(`✅ Event ${event} processed successfully`);
            } catch (processingError) {
              console.error(
                `Error processing event ${event}:`,
                processingError
              );
            }
          } catch (webhookError) {
            console.error('Error handling webhook:', webhookError);
            res.statusCode = 500;
            res.end('Error processing webhook');
          }
        });
      } else {
        // For non-POST requests, just return a simple response
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
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
    console.log(
      'Server initialization failed, but keeping process alive for debugging'
    );
  }
}

// Start the server with better error handling
startServer().catch((error) => {
  console.error('Fatal error:', error);
  console.log(
    'Server initialization failed, but keeping process alive for debugging'
  );
});

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
