/**
 * The core Probot application logic
 * @param {import('probot').Probot} app
 */
module.exports = function (app) {
  app.log.info('✅ GitHub Bot is now running!');

  // Log all events with detailed information
  app.onAny(async (context) => {
    try {
      app.log.info(`📥 Received event: ${context.name}`);
      app.log.info(`Event type: ${context.name}, Action: ${context.payload.action}`);
    } catch (error) {
      app.log.info(`📥 Received event: ${context.name} (error logging payload)`);
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

  // Handle all possible review events
  app.on(['pull_request_review.submitted', 'pull_request_review'], async (context) => {
    try {
      app.log.info(`🔎 Received review event: ${context.name}, action: ${context.payload.action}`);
      
      // Check if it's an approval - handle both direct submissions and action='submitted'
      if (
        (context.payload.action === 'submitted' && context.payload.review.state === 'approved') ||
        context.payload.review?.state === 'approved'
      ) {
        const pullRequest = context.payload.pull_request;
        const repo = context.repo();
        
        app.log.info(`📝 PR #${pullRequest.number} approved by ${context.payload.review.user.login}`);
        app.log.info(`Repository: ${repo.owner}/${repo.repo}`);
        
        // Try to add the approved label
        try {
          app.log.info(`Adding 'approved' label to PR #${pullRequest.number}`);
          
          // First try to create the label if it doesn't exist
          try {
            await context.octokit.issues.createLabel({
              ...repo,
              name: 'approved',
              color: '0e8a16', // Green color
              description: 'Pull request has been approved'
            });
            app.log.info('Created approved label');
          } catch (labelError) {
            app.log.info(`Note: ${labelError.message} (This may be normal if label exists)`);
          }
          
          // Add label to PR
          await context.octokit.issues.addLabels({
            ...repo,
            issue_number: pullRequest.number,
            labels: ['approved']
          });
          
          app.log.info(`✅ Successfully added 'approved' label to PR #${pullRequest.number}`);
          
          // Add a comment
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: pullRequest.number,
            body: `This pull request has been approved by @${context.payload.review.user.login} and has been labeled as 'approved'. 👍`
          });
        } catch (error) {
          app.log.error(`Error adding label: ${error.message}`);
          app.log.error(`Error status: ${error.status || 'unknown'}`);
          
          // Add a comment about the approval even if labeling failed
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: pullRequest.number,
            body: `This pull request has been approved by @${context.payload.review.user.login}. 👍 (Note: I couldn't add the 'approved' label due to an error)`
          });
        }
      } else {
        app.log.info(`Review state is ${context.payload.review?.state || 'unknown'}, not an approval`);
      }
    } catch (error) {
      app.log.error(`Error handling PR review: ${error.message}`);
      if (error.stack) app.log.error(`Stack trace: ${error.stack}`);
    }
  });

  // Also handle 'pull_request_review.submitted' separately
  app.on('pull_request_review.submitted', async (context) => {
    try {
      app.log.info(`🔎 Specific review.submitted event received with state: ${context.payload.review.state}`);
      
      // Process only if it's an approval
      if (context.payload.review.state === 'approved') {
        app.log.info('This is an approval review - processing via dedicated handler');
      }
    } catch (error) {
      app.log.error(`Error in specific review.submitted handler: ${error.message}`);
    }
  });
};