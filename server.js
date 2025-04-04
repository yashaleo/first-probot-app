const { Probot } = require('probot');
const http = require('http');
require('dotenv').config();

// Create Probot instance
const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: (process.env.PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET,
});

// Load the app
const app = require('./index.js');
probot.load(app);

// Create server
const { createNodeMiddleware } = require('probot');
const middleware = createNodeMiddleware(probot);
const server = http.createServer(middleware);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Probot server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
  process.exit(1);
});
