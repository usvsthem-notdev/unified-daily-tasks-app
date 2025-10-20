# Unified Daily Tasks App
## Installation & Setup Guide

**Version:** 1.0.0 | **Date:** October 20, 2025  
**Repository:** https://github.com/usvsthem-notdev/unified-daily-tasks-app

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Slack Configuration](#slack-configuration)
5. [Monday.com Setup](#mondaycom-setup)
6. [Deployment](#deployment)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

**Time Required:** 30 minutes  
**Difficulty:** Intermediate

### What You'll Need
- Node.js 18+ installed
- Slack workspace admin access
- Monday.com account with API access
- Render.com account (free tier works)
- GitHub account

---

## Prerequisites

### 1. Install Required Software

```bash
# Check Node.js version (must be 18+)
node --version

# Check npm
npm --version

# Check Git
git --version
```

### 2. Accounts Required
- ✅ Slack workspace (admin role)
- ✅ Monday.com workspace
- ✅ Render.com account
- ✅ GitHub account

---

## Installation Steps

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/usvsthem-notdev/unified-daily-tasks-app.git

# Navigate to directory
cd unified-daily-tasks-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

---

## Slack Configuration

### Step 1: Create Slack App

1. Visit https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. App Name: `Daily Tasks Manager`
4. Select your workspace → **"Create App"**

### Step 2: Configure OAuth Scopes

1. Go to **"OAuth & Permissions"**
2. Scroll to **"Bot Token Scopes"**
3. Add these scopes:
   - `chat:write` - Send messages
   - `commands` - Use slash commands
   - `users:read` - Read user info
   - `channels:read` - Read channels

### Step 3: Install App

1. Scroll to top of OAuth page
2. Click **"Install to Workspace"**
3. Click **"Allow"**
4. **Copy the Bot Token** (starts with `xoxb-`)
   - Save this - you'll need it for `.env`

### Step 4: Get Signing Secret

1. Click **"Basic Information"** in sidebar
2. Find **"App Credentials"** section
3. **Copy the Signing Secret**
   - Save this - you'll need it for `.env`

---

## Monday.com Setup

### Step 1: Get API Token

1. Log in to Monday.com
2. Click profile picture (bottom left)
3. Select **"Admin"** → **"API"**
4. Click **"Generate"** or copy existing token
5. **Save the token securely**

### Step 2: Find Board ID

1. Open the board you want to use
2. Look at the URL:
   ```
   https://yourworkspace.monday.com/boards/123456789
   ```
3. The Board ID is: `123456789`
4. **Save this number**

### Step 3: Find Workspace ID

Option A - From API:
```bash
curl https://api.monday.com/v2 \
  -H "Authorization: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ workspaces { id name } }"}'
```

Option B - Contact Monday.com support for workspace ID

---

## Environment Configuration

Edit your `.env` file with all credentials:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-1234567890-1234567890-abcdefg
SLACK_SIGNING_SECRET=a1b2c3d4e5f6g7h8i9j0
SLACK_APP_TOKEN=xapp-1-A01B2C3D4E5-12345

# Monday.com Configuration
MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9...
MONDAY_WORKSPACE_ID=1234567
MONDAY_BOARD_ID=987654321

# Server Configuration
PORT=3000
NODE_ENV=production

# Scheduling
DAILY_SUMMARY_TIME=09:00
TZ=America/Los_Angeles

# Performance
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=3600

# Logging
LOG_LEVEL=info
```

**Important:** Never commit `.env` file to Git!

---

## Deployment

### Step 1: Prepare for Deployment

```bash
# Verify .env is in .gitignore
cat .gitignore | grep .env

# Commit your changes (not .env!)
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy to Render

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect GitHub"** (if needed)
4. Select **"unified-daily-tasks-app"** repository
5. Click **"Connect"**

### Step 3: Configure Render Service

**Basic Settings:**
- Name: `unified-daily-tasks-app`
- Environment: `Node`
- Region: `US West` (or closest to you)
- Branch: `main`
- Build Command: `npm install`
- Start Command: `node src/app.js`

### Step 4: Add Environment Variables

In Render dashboard, add each variable from your `.env`:

Click **"Environment"** → **"Add Environment Variable"**

**Add these (mark secrets as "Secret"):**

| Key | Value | Secret? |
|-----|-------|---------|
| SLACK_BOT_TOKEN | xoxb-... | ✅ Yes |
| SLACK_SIGNING_SECRET | ... | ✅ Yes |
| SLACK_APP_TOKEN | xapp-... | ✅ Yes |
| MONDAY_API_KEY | ... | ✅ Yes |
| MONDAY_WORKSPACE_ID | 1234567 | No |
| MONDAY_BOARD_ID | 987654321 | No |
| NODE_ENV | production | No |
| PORT | 3000 | No |
| DAILY_SUMMARY_TIME | 09:00 | No |
| TZ | America/Los_Angeles | No |
| RATE_LIMIT_WINDOW_MS | 60000 | No |
| RATE_LIMIT_MAX_REQUESTS | 100 | No |
| CACHE_TTL | 3600 | No |
| LOG_LEVEL | info | No |

### Step 5: Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Wait 2-5 minutes for deployment
4. **Copy your app URL:** `https://unified-daily-tasks-app.onrender.com`

### Step 6: Verify Deployment

Test that your app is running:

```bash
# Health check
curl https://your-app.onrender.com/health

# Should return:
# {"status":"healthy","uptime":0,"timestamp":"..."}
```

---

## Post-Deployment: Configure Slack Commands

Now configure your Slack commands with the deployment URL.

### Step 1: Add Slash Commands

Go back to https://api.slack.com/apps → Your App → **"Slash Commands"**

For **each** command, click **"Create New Command"**:

#### Command 1: /tasks
- **Command:** `/tasks`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `View your assigned tasks`
- **Usage Hint:** _(leave empty)_

#### Command 2: /task-create
- **Command:** `/task-create`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Create a new task with form`

#### Command 3: /task-quick
- **Command:** `/task-quick`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Quick task creation`
- **Usage Hint:** `[task name]`

#### Command 4: /task-complete
- **Command:** `/task-complete`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Mark tasks as complete`

#### Command 5: /task-update
- **Command:** `/task-update`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Update task details`

#### Command 6: /task-settings
- **Command:** `/task-settings`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Configure your preferences`

#### Command 7: /task-help
- **Command:** `/task-help`
- **Request URL:** `https://your-app.onrender.com/slack/events`
- **Short Description:** `Show help information`

### Step 2: Update Interactive Components

1. Go to **"Interactivity & Shortcuts"**
2. Turn **Interactivity** to **ON**
3. **Request URL:** `https://your-app.onrender.com/slack/events`
4. Click **"Save Changes"**

---

## Testing

### Test 1: Health Check

```bash
curl https://your-app.onrender.com/health
```

**Expected:** `{"status":"healthy",...}`

### Test 2: Metrics

```bash
curl https://your-app.onrender.com/metrics
```

**Expected:** JSON with uptime, memory, commands stats

### Test 3: Slack Commands

In your Slack workspace:

**Test help command:**
```
/task-help
```
**Expected:** Message showing all available commands

**Test quick create:**
```
/task-quick Test installation task
```
**Expected:** "✅ Task created: Test installation task"

**Test view tasks:**
```
/tasks
```
**Expected:** List of your tasks or "You have no tasks"

**Test create modal:**
```
/task-create
```
**Expected:** Modal form opens

### Test 4: Verify in Monday.com

1. Go to your Monday.com board
2. Find the test task you created
3. Verify it's assigned to you

**✅ If all tests pass, installation is complete!**

---

## Troubleshooting

### Problem: "Command failed to execute"

**Cause:** Slack can't reach your app

**Solutions:**
1. Verify deployment is running:
   ```bash
   curl https://your-app.onrender.com/health
   ```
2. Check Request URLs in Slack commands match exactly
3. Check Render logs for errors
4. Verify environment variables are set

### Problem: "Tasks not creating in Monday.com"

**Cause:** Monday.com API issues

**Solutions:**
1. Test API token:
   ```bash
   curl https://api.monday.com/v2 \
     -H "Authorization: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ me { id } }"}'
   ```
2. Verify MONDAY_BOARD_ID is correct (numeric)
3. Check board permissions
4. Ensure API token has access to workspace

### Problem: "Too many requests" error

**Cause:** Rate limiting

**Solutions:**
1. Increase `RATE_LIMIT_MAX_REQUESTS` in Render
2. Check current metrics:
   ```bash
   curl https://your-app.onrender.com/metrics
   ```
3. Adjust based on team size

### Problem: Modals not opening

**Cause:** Interactive components not configured

**Solutions:**
1. Verify Interactive Components URL in Slack app
2. Should be: `https://your-app.onrender.com/slack/events`
3. Check it's toggled ON
4. Reinstall app to workspace if needed

### Getting More Help

**Check logs:**
```bash
# In Render dashboard
1. Go to your service
2. Click "Logs" tab
3. Look for error messages
```

**Resources:**
- README.md - Detailed documentation
- TESTING.md - Testing procedures
- GitHub Issues - Report bugs
- Slack API Docs - https://api.slack.com

---

## Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/tasks` | View assigned tasks | `/tasks` |
| `/task-create` | Create task (form) | `/task-create` |
| `/task-quick` | Quick create | `/task-quick Review PR` |
| `/task-complete` | Complete tasks | `/task-complete` |
| `/task-update` | Update task | `/task-update` |
| `/task-settings` | User settings | `/task-settings` |
| `/task-help` | Show help | `/task-help` |

---

## Performance Monitoring

### Health Check
```bash
curl https://your-app.onrender.com/health
```

### Metrics Dashboard
```bash
curl https://your-app.onrender.com/metrics
```

**Key Metrics:**
- Uptime
- Command response times
- Active users
- Error rate
- Memory usage

---

## Security Best Practices

1. ✅ Never commit `.env` to Git
2. ✅ Mark all tokens as "Secret" in Render
3. ✅ Rotate API keys every 90 days
4. ✅ Use HTTPS only (automatic on Render)
5. ✅ Monitor logs for suspicious activity
6. ✅ Keep dependencies updated
7. ✅ Enable 2FA on all accounts

---

## Maintenance

### Weekly
- Review metrics for anomalies
- Check error logs

### Monthly
- Update dependencies: `npm update`
- Run security audit: `npm audit`
- Review and rotate old API keys

### Quarterly
- Review rate limits
- Optimize cache settings
- User feedback review

---

## Support & Resources

### Documentation
- **README.md** - Full documentation
- **TESTING.md** - Testing guide
- **IMPLEMENTATION_SUMMARY.md** - Technical details

### External Resources
- **Slack API:** https://api.slack.com/docs
- **Monday.com API:** https://developer.monday.com
- **Render Docs:** https://render.com/docs

### Get Help
- **GitHub Issues:** https://github.com/usvsthem-notdev/unified-daily-tasks-app/issues
- **Repository:** https://github.com/usvsthem-notdev/unified-daily-tasks-app

---

## Conclusion

🎉 **Congratulations!** Your Unified Daily Tasks App is now installed and ready to use.

### What's Next?

1. **Train your team** on available commands
2. **Customize settings** per user
3. **Monitor performance** via metrics
4. **Gather feedback** for improvements
5. **Star the repository** on GitHub

### Quick Reference

- **Health:** `https://your-app.onrender.com/health`
- **Metrics:** `https://your-app.onrender.com/metrics`
- **Help Command:** `/task-help` in Slack
- **Repository:** https://github.com/usvsthem-notdev/unified-daily-tasks-app

---

**Document Version:** 1.0.0  
**Last Updated:** October 20, 2025  
**License:** MIT

© 2025 Unified Daily Tasks App
