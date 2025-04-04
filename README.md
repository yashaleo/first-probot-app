# first-probot-app

> A GitHub App built with [Probot v13](https://github.com/probot/probot) to automate issue comments and pull request reviewer assignments.

## ✨ Features

- 💬 Automatically comments on newly opened issues
- 👥 Auto-assigns reviewers for new pull requests using `.github/auto_assign.yml`
- ⚙️ Built with manual HTTP webhook handling (no Express or middleware)

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file with the following keys:

```
APP_ID=your-app-id
PRIVATE_KEY=your-private-key
WEBHOOK_SECRET=your-webhook-secret
```

### 3. Run the bot locally

```bash
npm start
```

## 🌍 Deployment

This app is optimized for [Heroku](https://heroku.com), but it will run anywhere Node.js is supported. It handles GitHub webhooks manually for better control and visibility.

## ⚙️ Configuration

To enable auto-assignment of reviewers on pull requests, add a file named `.github/auto_assign.yml` to your repo:

```yaml
reviewers:
  - your-github-username
  - another-collaborator
```

## 🤝 Contributing

Found a bug or have an idea to improve the app? Open an issue or submit a pull request. Contributions are always welcome!

## 📄 License

[ISC](LICENSE) © 2025 [yashaleo](https://github.com/yashaleo)
