/**
 * Entry point for your Probot app
 * @param {import('probot').Probot} app
 */
const appFn = (app) => {
  app.log.info("✅ GitHub Bot is now running!");

  app.onAny(async (context) => {
    app.log.info(`📥 Received event: ${context.name}`);
    app.log.info(`🔍 Payload: ${JSON.stringify(context.payload, null, 2)}`);
  });

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue! 🛠️",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  app.on("pull_request.opened", async (context) => {
    const config = await context.config("auto_assign.yml");
    let reviewers = (config && config.reviewers) || [];

    reviewers = reviewers.filter(r => r !== context.payload.sender.login);

    if (reviewers.length > 0) {
      const params = context.pullRequest({ reviewers });
      await context.octokit.pulls.requestReviewers(params);
    }
  });
};

export default appFn; // 👈 Name must be `appFn`
