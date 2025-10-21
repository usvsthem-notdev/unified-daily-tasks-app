require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// Import services
const MondayService = require('./services/monday');
const CacheService = require('./services/cache');
const MetricsService = require('./services/metrics');
const UserMappingService = require('./services/userMapping');

// Import command handlers
const TasksCommand = require('./commands/tasks');
const CreateCommand = require('./commands/create');
const QuickCommand = require('./commands/quick');
const CompleteCommand = require('./commands/complete');
const UpdateCommand = require('./commands/update');
const SettingsCommand = require('./commands/settings');
const HelpCommand = require('./commands/help');

// Import interaction handlers
const ModalHandler = require('./interactions/modals');
const ButtonHandler = require('./interactions/buttons');

// Import webhook handlers
const MondayWebhook = require('./webhooks/monday');

// Import automation
const DailySummary = require('./automation/dailySummary');

// Express receiver for custom routes
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events'
});

// Security middleware
receiver.router.use(helmet());
receiver.router.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later.'
});
receiver.router.use('/api/', limiter);

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  processBeforeResponse: true
});

// Initialize services (CRITICAL: Must initialize after app for UserMappingService)
const mondayService = new MondayService(process.env.MONDAY_API_KEY);
const cacheService = new CacheService();
const metricsService = new MetricsService();
const userMappingService = new UserMappingService(app.client);

// Health check endpoint
receiver.router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
receiver.router.get('/metrics', (req, res) => {
  res.json(metricsService.getMetrics());
});

// Monday.com webhook endpoint
receiver.router.post('/webhook/monday', async (req, res) => {
  try {
    await MondayWebhook.handle(req.body, app, mondayService);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register slash commands
app.command('/tasks', async ({ command, ack, client, respond }) => {
  await ack();
  await TasksCommand.handle(command, client, respond, mondayService, cacheService, userMappingService);
});

app.command('/task-create', async ({ command, ack, client, respond }) => {
  await ack();
  await CreateCommand.handle(command, client, respond, mondayService);
});

app.command('/task-quick', async ({ command, ack, respond }) => {
  await ack();
  await QuickCommand.handle(command, respond, mondayService);
});

app.command('/task-complete', async ({ command, ack, respond }) => {
  await ack();
  await CompleteCommand.handle(command, respond, mondayService, cacheService);
});

app.command('/task-update', async ({ command, ack, client, respond }) => {
  await ack();
  await UpdateCommand.handle(command, client, respond, mondayService);
});

app.command('/task-settings', async ({ command, ack, client }) => {
  await ack();
  await SettingsCommand.handle(command, client, cacheService);
});

app.command('/task-help', async ({ command, ack, respond }) => {
  await ack();
  await HelpCommand.handle(command, respond);
});

// Legacy command aliases with deprecation notices
app.command('/create-task', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    text: '⚠️ This command is deprecated. Please use `/task-create` instead.',
    response_type: 'ephemeral'
  });
  await CreateCommand.handle(command, null, respond, mondayService);
});

// Register modal handlers
app.view('create_task_modal', async ({ ack, body, view, client }) => {
  await ModalHandler.handleCreateTask(ack, body, view, client, mondayService);
});

app.view('update_task_modal', async ({ ack, body, view, client }) => {
  await ModalHandler.handleUpdateTask(ack, body, view, client, mondayService);
});

app.view('settings_modal', async ({ ack, body, view }) => {
  await ModalHandler.handleSettings(ack, body, view, cacheService);
});

// Register button handlers
app.action(/^complete_task_.*/, async ({ action, ack, body, client }) => {
  await ack();
  await ButtonHandler.handleCompleteTask(action, body, client, mondayService);
});

app.action(/^view_task_.*/, async ({ action, ack, body, client }) => {
  await ack();
  await ButtonHandler.handleViewTask(action, body, client, mondayService);
});

app.action(/^update_task_.*/, async ({ action, ack, body, client }) => {
  await ack();
  await ButtonHandler.handleUpdateTask(action, body, client, mondayService);
});

// Schedule daily summary
const summaryTime = process.env.DAILY_SUMMARY_TIME || '09:00';
const [hour, minute] = summaryTime.split(':');
cron.schedule(`${minute} ${hour} * * *`, async () => {
  console.log('Running daily task summary...');
  await DailySummary.send(app, mondayService, cacheService);
});

// Error handling
app.error(async (error) => {
  console.error('Application error:', error);
  metricsService.recordError(error);
});

// Start the app
const PORT = process.env.PORT || 3000;

(async () => {
  await app.start(PORT);
  console.log(`⚡️ Unified Daily Tasks App is running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`✅ User mapping service initialized`);
})();

module.exports = { app, mondayService, cacheService, metricsService, userMappingService };
