/**
 * The core Probot application logic - Simplified diagnostic version
 * @param {import('probot').Probot} app
 */
module.exports = function (app) {
  app.log.info('✅ GitHub Bot diagnostic version is now running!');

  // Log ALL events very verbosely
  app.onAny(async (context) => {
    try {
      const eventName = context.name;
      const action = context.payload.action;
      const sender = context.payload.sender?.login;

      app.log.info(`📌 EVENT RECEIVED: ${eventName}.${action} from ${sender}`);

      // Log key payload parts based on event type
      if (eventName === 'pull_request') {
        app.log.info(
          `PR #${context.payload.pull_request.number}: ${context.payload.pull_request.title}`
        );
      } else if (eventName === 'issues') {
        app.log.info(
          `Issue #${context.payload.issue.number}: ${context.payload.issue.title}`
        );
      } else if (eventName === 'issue_comment') {
        app.log.info(
          `Comment on #${
            context.payload.issue.number
          }: "${context.payload.comment.body.substring(0, 30)}..."`
        );
      } else if (eventName.includes('review')) {
        app.log.info(
          `REVIEW EVENT: PR #${context.payload.pull_request?.number}, type: ${context.payload.review?.state}`
        );
      }
    } catch (error) {
      app.log.error(`Error logging event: ${error.message}`);
    }
  });

  // Respond to new issues
  app.on('issues.opened', async (context) => {
    try {
      const issueComment = context.issue({
        body: "Thanks for opening this issue! 🛠️ We'll look into it soon.",
      });
      await context.octokit.issues.createComment(issueComment);
      app.log.info('✅ Comment added to new issue');
    } catch (error) {
      app.log.error(`Error commenting on issue: ${error.message}`);
    }
  });

  // Respond to comments with /test command
  app.on('issue_comment.created', async (context) => {
    try {
      // Check if this is a PR comment
      const isPR = Boolean(context.payload.issue.pull_request);
      const commentBody = context.payload.comment.body.trim();

      app.log.info(
        `Comment received: "${commentBody}" on ${isPR ? 'PR' : 'issue'} #${
          context.payload.issue.number
        }`
      );

      // Only respond to /test command
      if (commentBody === '/test') {
        app.log.info('Test command detected!');

        const repo = context.repo();
        const issueNumber = context.payload.issue.number;

        // Reply to the test command
        await context.octokit.issues.createComment({
          ...repo,
          issue_number: issueNumber,
          body: `Test command received from @${context.payload.comment.user.login}! 👍`,
        });

        app.log.info('Replied to test command');

        // Try to add a test label
        try {
          // Create a test label if it doesn't exist
          try {
            await context.octokit.issues.createLabel({
              ...repo,
              name: 'test-label',
              color: 'ff00ff',
              description: 'Test label from bot',
            });
          } catch (labelError) {
            app.log.info(`Note about label creation: ${labelError.message}`);
          }

          // Add the label
          await context.octokit.issues.addLabels({
            ...repo,
            issue_number: issueNumber,
            labels: ['test-label'],
          });

          app.log.info('Added test-label to PR/issue');
        } catch (error) {
          app.log.error(`Failed to add test label: ${error.message}`);
        }
      }
    } catch (error) {
      app.log.error(`Error handling comment: ${error.message}`);
    }
  });

  // Track pull_request_review events specifically
  app.on('pull_request_review', async (context) => {
    app.log.info('🎯 PULL REQUEST REVIEW EVENT RECEIVED!');
    app.log.info(`Review state: ${context.payload.review.state}`);
    app.log.info(`Action: ${context.payload.action}`);
    app.log.info(`Reviewer: ${context.payload.review.user.login}`);
  });
};
