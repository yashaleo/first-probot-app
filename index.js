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
    } catch (error) {
      app.log.info(
        `📥 Received event: ${context.name} (error logging payload)`
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
      // Get config from .github/auto_assign.yml
      const config = await context.config('auto_assign.yml');

      if (!config) {
        app.log.warn('No auto_assign.yml config found.');

        // Still comment on the PR even without config
        await context.octokit.issues.createComment(
          context.issue({
            body: `👋 Thanks for opening this pull request! I couldn't find any reviewer configuration, but we'll review this soon.`,
          })
        );
        return;
      }

      let reviewers = (config && config.reviewers) || [];

      // Don't assign the PR creator as a reviewer
      reviewers = reviewers.filter((r) => r !== context.payload.sender.login);

      // First, add a comment about the PR
      await context.octokit.issues.createComment(
        context.issue({
          body: `👋 Thanks for opening this pull request! I'll try to find reviewers for it.`,
        })
      );

      // Then try to assign reviewers (may fail, but that's okay)
      if (reviewers.length > 0) {
        try {
          await context.octokit.pulls.requestReviewers(
            context.pullRequest({ reviewers })
          );
          app.log.info(`✅ Assigned reviewers: ${reviewers.join(', ')}`);

          // Add a success comment
          await context.octokit.issues.createComment(
            context.issue({
              body: `I've assigned the following reviewers: ${reviewers
                .map((r) => `@${r}`)
                .join(', ')}`,
            })
          );
        } catch (reviewerError) {
          app.log.warn(
            `⚠️ Could not assign reviewers: ${reviewerError.message}`
          );

          // No need to add another comment about the failure
        }
      } else {
        app.log.warn('⚠️ No eligible reviewers found.');
      }
    } catch (error) {
      app.log.error(`Error in pull_request.opened handler: ${error.message}`);
    }
  });
};
