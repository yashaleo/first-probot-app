/**
 * @type {import('probot').ProbotPlugin}
 */
export const myApp = (app) => {
  app.log.info('✅ GitHub Bot is now running!');

  // Log all events
  app.onAny(async (context) => {
    app.log.info(`📥 Received event: ${context.name}`);
    app.log.info(`🔍 Payload: ${JSON.stringify(context.payload, null, 2)}`);
  });

  // Respond to new issues
  app.on('issues.opened', async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue! 🛠️ We'll look into it soon.",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  // Auto-assign reviewers to PRs
  app.on('pull_request.opened', async (context) => {
    const config = await context.config('auto_assign.yml');
    let reviewers = (config && config.reviewers) || [];

    // Filter out the PR author
    reviewers = reviewers.filter((r) => r !== context.payload.sender.login);

    if (reviewers.length > 0) {
      await context.octokit.pulls.requestReviewers(
        context.pullRequest({ reviewers })
      );
      app.log.info(`✅ Assigned reviewers: ${reviewers.join(', ')}`);
    } else {
      app.log.warn('⚠️ No eligible reviewers found.');
    }
  });
};
