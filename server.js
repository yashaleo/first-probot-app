const { Probot } = require('probot');
const http = require('http');
require('dotenv').config();

// Explicitly load the app handler function
const probotApp = require('./index.js');

// Function to start the server
async function startServer() {
  try {
    // Create Probot instance
    const probot = new Probot({
      appId: process.env.APP_ID,
      privateKey: (process.env.PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      secret: process.env.WEBHOOK_SECRET,
    });

    // Load the app explicitly by calling probot.load with our function
    probot.load(probotApp);

    // Verify app was loaded
    console.log(`✅ App loaded successfully: ${typeof probotApp}`);

    // Create the middleware (AFTER loading the app)
    const { createNodeMiddleware } = require('probot');
    const middleware = createNodeMiddleware(probot);

    // Create server
    const server = http.createServer(middleware);

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
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
