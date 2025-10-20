# Quick Reference Card
## Unified Daily Tasks App

---

## 🚀 Installation (5 Steps)

### 1. Clone & Install
```bash
git clone https://github.com/usvsthem-notdev/unified-daily-tasks-app.git
cd unified-daily-tasks-app
npm install
cp .env.example .env
```

### 2. Get Slack Credentials
- Go to https://api.slack.com/apps
- Create app, add scopes, install
- Copy Bot Token & Signing Secret

### 3. Get Monday.com Credentials
- Login → Profile → Admin → API
- Copy API Token
- Get Board ID from URL

### 4. Deploy to Render
- Push to GitHub
- Create Web Service on Render
- Add environment variables
- Deploy

### 5. Configure Slack Commands
- Add 7 slash commands
- Point to: `https://your-app.onrender.com/slack/events`
- Enable Interactive Components

---

## 📋 Commands

| Command | What It Does |
|---------|-------------|
| `/tasks` | List all your tasks |
| `/task-create` | Create task with form |
| `/task-quick [name]` | Quick create |
| `/task-complete` | Mark tasks done |
| `/task-update` | Update task |
| `/task-settings` | User preferences |
| `/task-help` | Show help |

---

## 🔧 Environment Variables

```env
# Required
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
MONDAY_API_KEY=...
MONDAY_BOARD_ID=123456789

# Optional
PORT=3000
NODE_ENV=production
DAILY_SUMMARY_TIME=09:00
TZ=America/Los_Angeles
```

---

## ✅ Testing

```bash
# Health Check
curl https://your-app.onrender.com/health

# Metrics
curl https://your-app.onrender.com/metrics

# In Slack
/task-help
/task-quick Test task
/tasks
```

---

## 🐛 Troubleshooting

**Commands not working?**
- Check Request URLs in Slack
- Verify deployment is running
- Check environment variables

**Monday.com not syncing?**
- Verify API token
- Check Board ID (must be numeric)
- Confirm board permissions

**View logs:**
- Render Dashboard → Logs tab

---

## 📞 Quick Links

- **Repo:** https://github.com/usvsthem-notdev/unified-daily-tasks-app
- **Health:** `https://your-app.onrender.com/health`
- **Metrics:** `https://your-app.onrender.com/metrics`
- **Slack API:** https://api.slack.com/apps
- **Render:** https://dashboard.render.com

---

## 🔐 Security Checklist

- [ ] `.env` in `.gitignore`
- [ ] All secrets marked "Secret" in Render
- [ ] OAuth scopes minimal
- [ ] HTTPS only
- [ ] 2FA enabled on all accounts

---

## 📊 Performance Targets

- Response time: < 200ms
- Uptime: > 99.9%
- Cache hit rate: > 80%
- Error rate: < 0.1%

---

**Version 1.0.0** | MIT License
