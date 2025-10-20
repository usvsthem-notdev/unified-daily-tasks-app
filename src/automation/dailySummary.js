class DailySummary {
  static async send(app, mondayService, cacheService) {
    try {
      console.log('Starting daily task summary...');

      const boardId = process.env.MONDAY_BOARD_ID;
      
      // Get all tasks from board
      const tasks = await mondayService.getBoardItems(boardId);

      // Group tasks by assigned user
      const tasksByUser = new Map();

      tasks.forEach(task => {
        const peopleColumn = task.column_values.find(col => 
          col.title === 'Person' || col.id === 'person'
        );

        if (!peopleColumn || !peopleColumn.persons_and_teams) return;

        peopleColumn.persons_and_teams.forEach(person => {
          if (!tasksByUser.has(person.id)) {
            tasksByUser.set(person.id, []);
          }
          tasksByUser.get(person.id).push(task);
        });
      });

      // Send summary to each user
      for (const [userId, userTasks] of tasksByUser) {
        try {
          // Check user preferences
          const prefs = cacheService.getUserPreferences(userId);
          
          if (!prefs.notifications) {
            console.log(`Skipping summary for ${userId} - notifications disabled`);
            continue;
          }

          await this.sendUserSummary(app, userId, userTasks);
        } catch (error) {
          console.error(`Failed to send summary to ${userId}:`, error);
        }
      }

      console.log('Daily task summary completed');

    } catch (error) {
      console.error('Error sending daily summaries:', error);
    }
  }

  static async sendUserSummary(app, userId, tasks) {
    // Categorize tasks by status
    const pending = tasks.filter(t => {
      const status = t.column_values.find(c => c.id === 'status');
      return status && status.text !== 'Done' && status.text !== 'Complete';
    });

    const completed = tasks.filter(t => {
      const status = t.column_values.find(c => c.id === 'status');
      return status && (status.text === 'Done' || status.text === 'Complete');
    });

    // Build summary message
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 Daily Task Summary',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Good morning! Here's your task overview:`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*📝 Pending Tasks:*\n${pending.length}`
          },
          {
            type: 'mrkdwn',
            text: `*✅ Completed:*\n${completed.length}`
          }
        ]
      }
    ];

    // Add pending tasks (max 5)
    if (pending.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your pending tasks:*'
        }
      });

      pending.slice(0, 5).forEach(task => {
        const statusColumn = task.column_values.find(c => c.id === 'status');
        const status = statusColumn?.text || 'No Status';

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `• *${task.name}* (${status})`
          }
        });
      });

      if (pending.length > 5) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_...and ${pending.length - 5} more tasks_`
            }
          ]
        });
      }
    }

    // Add action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View All Tasks',
            emoji: true
          },
          style: 'primary',
          value: 'view_tasks',
          action_id: 'view_all_tasks'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Create New Task',
            emoji: true
          },
          value: 'create_task',
          action_id: 'create_new_task'
        }
      ]
    });

    // Send message
    await app.client.chat.postMessage({
      channel: userId,
      blocks
    });
  }
}

module.exports = DailySummary;
