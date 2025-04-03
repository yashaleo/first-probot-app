/**
 * Entry point for your Probot app
 * @param {import('probot').Probot} app
 */
export default function myApp(app) {
  // Log when the app is loaded
  app.log.info('✅ GitHub Bot is now running!');

  // Log all events to help with debugging
  app.onAny(async (context) => {
    app.log.info(`📥 Received event: ${context.name}`);
    app.log.info(`🔍 Payload: ${JSON.stringify(context.payload, null, 2)}`);
  });

  // Handle new issue events
  app.on('issues.opened', async (context) => {
    try {
      const issueComment = context.issue({
        body: 'Thanks for opening this issue! 🛠️',
      });

      await context.octokit.issues.createComment(issueComment);
      app.log.info('✅ Comment created on issue.');
    } catch (err) {
      app.log.error('❌ Failed to comment on issue:', err);
    }
  });

  // Handle new pull request events
  app.on('pull_request.opened', async (context) => {
    try {
      // Load reviewer list from .github/auto_assign.yml
      const config = await context.config('auto_assign.yml');

      // Use reviewers from config, fallback to empty array
      let reviewers = (config && config.reviewers) || [];

      // Remove the sender from the reviewer list
      reviewers = reviewers.filter((r) => r !== context.payload.sender.login);

      if (reviewers.length > 0) {
        const params = context.pullRequest({ reviewers });
        await context.octokit.pulls.requestReviewers(params);
        app.log.info(`✅ Assigned reviewers: ${reviewers.join(', ')}`);
      } else {
        app.log.warn('⚠️ No reviewers found or all were filtered out.');
      }
    } catch (err) {
      context.log.error('❌ Error assigning reviewers', err);
    }
  });
}
