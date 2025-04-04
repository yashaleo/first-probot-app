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
      const config = await context.config('auto_assign.yml');

      if (!config) {
        app.log.warn('No auto_assign.yml config found.');
        await context.octokit.issues.createComment(
          context.issue({
            body: `👋 Thanks for opening this pull request! I couldn't find any reviewer configuration, but we'll review this soon.`,
          })
        );
        return;
      }

      let reviewers = (config && config.reviewers) || [];
      reviewers = reviewers.filter((r) => r !== context.payload.sender.login);

      await context.octokit.issues.createComment(
        context.issue({
          body: `👋 Thanks for opening this pull request! I'll try to find reviewers for it.`,
        })
      );

      if (reviewers.length > 0) {
        try {
          await context.octokit.pulls.requestReviewers(
            context.pullRequest({ reviewers })
          );
          app.log.info(`✅ Assigned reviewers: ${reviewers.join(', ')}`);
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
        }
      } else {
        app.log.warn('⚠️ No eligible reviewers found.');
      }
    } catch (error) {
      app.log.error(`Error in pull_request.opened handler: ${error.message}`);
    }
  });

  // Handle issue comments for commands
  app.on('issue_comment.created', async (context) => {
    try {
      const isPR = Boolean(context.payload.issue.pull_request);
      if (!isPR) return;

      const comment = context.payload.comment.body.trim().toLowerCase();
      const repo = context.repo();
      const issueNumber = context.payload.issue.number;
      const commenter = context.payload.comment.user.login;

      if (comment === '/approve') {
        try {
          await context.octokit.issues.createLabel({
            ...repo,
            name: 'approved',
            color: '0e8a16',
            description: 'Pull request has been approved',
          });
        } catch (labelError) {
          app.log.info(`Note: ${labelError.message} (label may already exist)`);
        }

        await context.octokit.issues.addLabels({
          ...repo,
          issue_number: issueNumber,
          labels: ['approved'],
        });

        app.log.info(`✅ Added 'approved' label to PR #${issueNumber}`);

        await context.octokit.issues.createComment({
          ...repo,
          issue_number: issueNumber,
          body: `This pull request has been approved by @${commenter} and labeled as 'approved'. 👍`,
        });
      } else if (comment === '/close') {
        await context.octokit.issues.update({
          ...repo,
          issue_number: issueNumber,
          state: 'closed',
        });

        await context.octokit.issues.createComment({
          ...repo,
          issue_number: issueNumber,
          body: `🔒 Closed by @${commenter} using /close command.`,
        });
        app.log.info(`🔒 PR #${issueNumber} closed by ${commenter}`);
      } else if (comment === '/merge') {
        try {
          await context.octokit.pulls.merge({
            ...repo,
            pull_number: issueNumber,
            merge_method: 'squash',
          });

          await context.octokit.issues.createComment({
            ...repo,
            issue_number: issueNumber,
            body: `✅ PR merged by @${commenter} using /merge command.`,
          });
          app.log.info(`✅ PR #${issueNumber} merged by ${commenter}`);
        } catch (mergeError) {
          app.log.error(`Merge failed: ${mergeError.message}`);
          await context.octokit.issues.createComment({
            ...repo,
            issue_number: issueNumber,
            body: `❌ Merge failed: ${mergeError.message}`,
          });
        }
      } else if (comment === '/bug') {
        try {
          await context.octokit.issues.createLabel({
            ...repo,
            name: 'bug',
            color: 'd73a4a',
            description: 'Something isn’t working',
          });
        } catch (labelError) {
          app.log.info(`Note: ${labelError.message} (label may already exist)`);
        }

        await context.octokit.issues.addLabels({
          ...repo,
          issue_number: issueNumber,
          labels: ['bug'],
        });

        await context.octokit.issues.createComment({
          ...repo,
          issue_number: issueNumber,
          body: `🐛 Bug label added by @${commenter} using /bug command.`,
        });
        app.log.info(`🐛 Bug label added to PR #${issueNumber}`);
      }
    } catch (error) {
      app.log.error(`Error handling comment: ${error.message}`);
    }
  });
};
