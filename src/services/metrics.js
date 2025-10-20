class MetricsService {
  constructor() {
    this.metrics = {
      commands: 0,
      errors: 0,
      total: 0,
      commandTimes: [],
      activeUsers: new Set(),
      webhooks: 0,
      startTime: Date.now()
    };
  }

  recordCommand(commandName, userId, duration) {
    this.metrics.commands++;
    this.metrics.total++;
    this.metrics.activeUsers.add(userId);
    this.metrics.commandTimes.push({
      command: commandName,
      duration,
      timestamp: Date.now()
    });

    // Keep only last 1000 command times
    if (this.metrics.commandTimes.length > 1000) {
      this.metrics.commandTimes.shift();
    }
  }

  recordError(error) {
    this.metrics.errors++;
    this.metrics.total++;
    console.error('Recorded error:', error);
  }

  recordWebhook() {
    this.metrics.webhooks++;
  }

  getMetrics() {
    const uptime = (Date.now() - this.metrics.startTime) / 1000;
    const errorRate = this.metrics.total > 0 
      ? (this.metrics.errors / this.metrics.total) * 100 
      : 0;

    // Calculate average command time
    const avgCommandTime = this.metrics.commandTimes.length > 0
      ? this.metrics.commandTimes.reduce((sum, cmd) => sum + cmd.duration, 0) / this.metrics.commandTimes.length
      : 0;

    // Calculate p95 command time
    const sortedTimes = [...this.metrics.commandTimes].sort((a, b) => a.duration - b.duration);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95CommandTime = sortedTimes[p95Index]?.duration || 0;

    return {
      uptime: Math.floor(uptime),
      memory: process.memoryUsage(),
      commands: {
        total: this.metrics.commands,
        avgTime: Math.round(avgCommandTime),
        p95Time: Math.round(p95CommandTime)
      },
      webhooks: this.metrics.webhooks,
      activeUsers: this.metrics.activeUsers.size,
      errors: this.metrics.errors,
      errorRate: errorRate.toFixed(2) + '%',
      totalRequests: this.metrics.total
    };
  }

  getCommandStats() {
    const commandCounts = {};
    this.metrics.commandTimes.forEach(cmd => {
      commandCounts[cmd.command] = (commandCounts[cmd.command] || 0) + 1;
    });

    return commandCounts;
  }

  reset() {
    this.metrics.commands = 0;
    this.metrics.errors = 0;
    this.metrics.total = 0;
    this.metrics.commandTimes = [];
    this.metrics.activeUsers.clear();
    this.metrics.webhooks = 0;
  }
}

module.exports = MetricsService;
