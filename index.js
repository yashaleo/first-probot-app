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
      app.log.info(
        `Event type: ${context.name}, Action: ${context.payload.action}`
      );

      // Log the event name and payload for debugging
      if (context.name.includes('review')) {
        app.log.info(
          `REVIEW EVENT DETECTED: ${JSON.stringify({
            event: context.name,
            action: context.payload.action,
            review: context.payload.review
              ? {
                  state: context.payload.review.state,
                  user: context.payload.review.user?.login,
                }
              : 'no review data',
          })}`
        );
      }
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

  // Listen for PR reviews directly
  app.on('pull_request_review', async (context) => {
    try {
      app.log.info(
        `📣 PR Review event received: action=${context.payload.action}`
      );

      // Only process approvals
      if (
        context.payload.review &&
        context.payload.review.state === 'approved'
      ) {
        const pullRequest = context.payload.pull_request;
        const repo = context.repo();

        app.log.info(
          `📝 PR #${pullRequest.number} approved by ${context.payload.review.user.login}`
        );

        // Try to add the approved label
        await addApprovedLabel(context, pullRequest, repo);
      }
    } catch (error) {
      app.log.error(`Error handling pull_request_review: ${error.message}`);
    }
  });

  // Listen for labeled events as a backup
  app.on('pull_request.labeled', async (context) => {
    try {
      app.log.info(`Label added to PR: ${context.payload.label.name}`);

      // If this is a manual approval label, add our comment
      if (context.payload.label.name.toLowerCase() === 'approved') {
        const pullRequest = context.payload.pull_request;
        const repo = context.repo();

        // Get the latest reviews for this PR
        const reviews = await context.octokit.pulls.listReviews({
          ...repo,
          pull_number: pullRequest.number,
        });

        // Find the most recent approval, if any
        const approvals = reviews.data.filter(
          (review) => review.state === 'APPROVED'
        );

        if (approvals.length > 0) {
          const latestApproval = approvals[approvals.length - 1];

          app.log.info(`Found approval by ${latestApproval.user.login}`);

          // Add a comment about the approval
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: pullRequest.number,
            body: `This pull request has been approved by @${latestApproval.user.login} and has been labeled as 'approved'. 👍`,
          });
        } else {
          // No approvals found, but label was added
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: pullRequest.number,
            body: `This pull request has been labeled as 'approved'. 👍`,
          });
        }
      }
    } catch (error) {
      app.log.error(`Error handling labeled event: ${error.message}`);
    }
  });

  // Helper function to add the approved label
  async function addApprovedLabel(context, pullRequest, repo) {
    try {
      app.log.info(`Adding 'approved' label to PR #${pullRequest.number}`);

      // First try to create the label if it doesn't exist
      try {
        await context.octokit.issues.createLabel({
          ...repo,
          name: 'approved',
          color: '0e8a16', // Green color
          description: 'Pull request has been approved',
        });
        app.log.info('Created approved label');
      } catch (labelError) {
        app.log.info(`Note: Could not create label: ${labelError.message}`);
      }

      // Add label to PR
      await context.octokit.issues.addLabels({
        ...repo,
        issue_number: pullRequest.number,
        labels: ['approved'],
      });

      app.log.info(
        `✅ Successfully added 'approved' label to PR #${pullRequest.number}`
      );

      // Add a comment
      await context.octokit.issues.createComment({
        ...repo,
        issue_number: pullRequest.number,
        body: `This pull request has been approved by @${context.payload.review.user.login} and has been labeled as 'approved'. 👍`,
      });

      return true;
    } catch (error) {
      app.log.error(`Error adding label: ${error.message}`);

      // Add a comment about the approval even if labeling failed
      await context.octokit.issues.createComment({
        ...repo,
        issue_number: pullRequest.number,
        body: `This pull request has been approved by @${context.payload.review.user.login}. 👍 (Note: I couldn't add the 'approved' label due to an error)`,
      });

      return false;
    }
  }
};
