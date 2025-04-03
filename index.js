/**
 * Entry point for your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  // Log when the app is loaded
  app.log.info('✅ GitHub Bot is now running!');

  // Handle new issue events
  app.on('issues.opened', async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue! We’ll take a look. 🛠️ (I'm a bot)",
    });

    return context.octokit.issues.createComment(issueComment);
  });

  // Handle new pull request events
  app.on('pull_request.opened', async (context) => {
    try {
      // Load reviewer list from .github/auto_assign.yml
      const config = await context.config('auto_assign.yml');

      // Fallback if config or reviewers list is missing
      let reviewers = (config && config.reviewers) || [];

      // Remove yourself from the reviewer list
      reviewers = reviewers.filter((r) => r !== 'context.payload.sender.login');

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
};
