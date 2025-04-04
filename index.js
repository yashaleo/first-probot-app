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

  // Add 'approved' label when a PR is approved
  app.on('pull_request_review.submitted', async (context) => {
    try {
      // Only process approvals
      if (context.payload.review.state !== 'approved') {
        app.log.info(
          `Review was ${context.payload.review.state}, not an approval. Skipping.`
        );
        return;
      }

      const pullRequest = context.payload.pull_request;
      const repo = context.repo();

      app.log.info(
        `📝 PR #${pullRequest.number} approved by ${context.payload.review.user.login}`
      );
      app.log.info(`Repository: ${repo.owner}/${repo.repo}`);

      // First try to get all existing labels to check if 'approved' exists
      app.log.info(
        `Checking for existing labels in ${repo.owner}/${repo.repo}`
      );
      const existingLabels = await context.octokit.issues.listLabelsForRepo({
        ...repo,
        per_page: 100,
      });

      app.log.info(
        `Found ${existingLabels.data.length} labels in the repository`
      );
      const existingLabelNames = existingLabels.data.map((label) => label.name);
      app.log.info(`Existing labels: ${existingLabelNames.join(', ')}`);

      // Check if 'approved' label exists
      if (!existingLabelNames.includes('approved')) {
        // Create the 'approved' label
        app.log.info('Creating "approved" label');
        try {
          await context.octokit.issues.createLabel({
            ...repo,
            name: 'approved',
            color: '0e8a16', // Green color
            description: 'Pull request has been approved',
          });
          app.log.info('✅ Created "approved" label successfully');
        } catch (labelError) {
          app.log.error(
            `Error creating "approved" label: ${labelError.message}`
          );
          if (labelError.status === 422) {
            app.log.info(
              'Label might already exist with a different case. Trying to fetch all labels again...'
            );
          }
        }
      }

      // Add the label to the PR
      app.log.info(
        `Attempting to add "approved" label to PR #${pullRequest.number}`
      );
      try {
        await context.octokit.issues.addLabels({
          ...repo,
          issue_number: pullRequest.number,
          labels: ['approved'],
        });
        app.log.info(`✅ Added 'approved' label to PR #${pullRequest.number}`);
      } catch (addLabelError) {
        app.log.error(`Failed to add label: ${addLabelError.message}`);
        app.log.error(`Error status: ${addLabelError.status}`);

        // Add a comment about the label issue
        await context.octokit.issues.createComment({
          ...repo,
          issue_number: pullRequest.number,
          body: `This pull request has been approved by @${context.payload.review.user.login}, but I couldn't add the 'approved' label due to an error. Please check the bot's permissions or add the label manually.`,
        });
        return;
      }

      // Add a comment about the approval and label
      await context.octokit.issues.createComment({
        ...repo,
        issue_number: pullRequest.number,
        body: `This pull request has been approved by @${context.payload.review.user.login} and has been labeled as 'approved'. 👍`,
      });
    } catch (error) {
      app.log.error(`Error handling PR approval: ${error.message}`);
      if (error.status) app.log.error(`Status code: ${error.status}`);
      if (error.response && error.response.data) {
        app.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
  });
};
