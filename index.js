/**
 * The core Probot application logic
 * @param {import('probot').Probot} app
 */
module.exports = function (app) {
  app.log.info('✅ GitHub Bot is now running!');

  // Log all events
  app.onAny(async (context) => {
    try {
      app.log.info(`📥 Received event: ${context.name}`);
      app.log.info(`🔍 Payload: ${JSON.stringify(context.payload, null, 2)}`);
    } catch (error) {
      app.log.info(
        `📥 Received event: ${context.name} (payload too large to log)`
      );
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

  // Auto-assign reviewers to PRs
  app.on('pull_request.opened', async (context) => {
    try {
      const config = await context.config('auto_assign.yml');
      let reviewers = (config && config.reviewers) || [];
      reviewers = reviewers.filter((r) => r !== context.payload.sender.login);

      if (reviewers.length > 0) {
        await context.octokit.pulls.requestReviewers(
          context.pullRequest({ reviewers })
        );
        app.log.info(`✅ Assigned reviewers: ${reviewers.join(', ')}`);
      } else {
        app.log.warn('⚠️ No eligible reviewers found.');
      }
    } catch (error) {
      app.log.error(`Error assigning reviewers: ${error.message}`);
    }
  });
};
