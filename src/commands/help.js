class HelpCommand {
  static async handle(command, respond) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📚 Task Management Commands',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Here are all available commands for managing your tasks:'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/tasks`*\nView all your assigned tasks with their current status and quick actions.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/task-create`*\nOpen a form to create a new task with details like priority and due date.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/task-quick [task name]`*\nQuickly create a task without opening a form. Just type the task name after the command.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/task-complete`*\nView and complete your pending tasks.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/task-update`*\nUpdate an existing task\'s details, status, or assignee.'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*`/task-settings`*\nConfigure your notification preferences and daily summary settings.'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Examples:*\n• `/tasks` - See your task list\n• `/task-quick Review design mockups` - Create task instantly\n• `/task-create` - Open detailed creation form'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💡 *Tip:* You receive daily summaries of your tasks. Use `/task-settings` to customize when you receive them.'
          }
        ]
      }
    ];

    await respond({
      blocks,
      response_type: 'ephemeral'
    });
  }
}

module.exports = HelpCommand;
