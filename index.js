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

  // Handle PR comments with "/approve" command
  app.on('issue_comment.created', async (context) => {
    try {
      // Check if this is a PR comment (issues and PRs share the same comment API)
      const isPR = Boolean(context.payload.issue.pull_request);
      if (!isPR) {
        return;
      }

      const comment = context.payload.comment.body.trim();

      // Check for approval command
      if (comment.toLowerCase() === '/approve') {
        app.log.info(
          `Approval command detected from ${context.payload.comment.user.login}`
        );

        const repo = context.repo();
        const issueNumber = context.payload.issue.number;

        // Create and add the approved label
        try {
          // Try to create the label first (will fail if it exists, which is fine)
          try {
            await context.octokit.issues.createLabel({
              ...repo,
              name: 'approved',
              color: '0e8a16', // Green color
              description: 'Pull request has been approved',
            });
            app.log.info('Created approved label');
          } catch (labelError) {
            app.log.info(
              `Note: ${labelError.message} (This is normal if label exists)`
            );
          }

          // Add the label to the PR
          await context.octokit.issues.addLabels({
            ...repo,
            issue_number: issueNumber,
            labels: ['approved'],
          });

          app.log.info(`✅ Added 'approved' label to PR #${issueNumber}`);

          // Add a comment confirming the approval
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: issueNumber,
            body: `This pull request has been approved by @${context.payload.comment.user.login} and labeled as 'approved'. 👍`,
          });
        } catch (error) {
          app.log.error(`Error adding label: ${error.message}`);

          // Add a comment about the error
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: issueNumber,
            body: `@${context.payload.comment.user.login} tried to approve this PR, but I couldn't add the 'approved' label: ${error.message}`,
          });
        }
      }
    } catch (error) {
      app.log.error(`Error handling comment: ${error.message}`);
    }
  });

  // Listen for labeled events (backup)
  app.on('pull_request.labeled', async (context) => {
    try {
      app.log.info(`Label added to PR: ${context.payload.label.name}`);

      // If this is a manual approval label, add our comment
      if (context.payload.label.name.toLowerCase() === 'approved') {
        const pullRequest = context.payload.pull_request;
        const repo = context.repo();

        app.log.info(`Approved label detected on PR #${pullRequest.number}`);

        // Add a comment about the approval label
        await context.octokit.issues.createComment({
          ...repo,
          issue_number: pullRequest.number,
          body: `This pull request has been labeled as 'approved'. 👍`,
        });
      }
    } catch (error) {
      app.log.error(`Error handling labeled event: ${error.message}`);
    }
  });
};
