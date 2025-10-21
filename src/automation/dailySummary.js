class DailySummary {
  static async send(app, mondayService, cacheService, userMappingService) {
    try {
      console.log('Starting daily task summary...');

      const boardId = process.env.MONDAY_BOARD_ID;
      
      // Get all tasks from board
      const tasks = await mondayService.getBoardItems(boardId);

      // Group tasks by assigned user (Monday.com identifier)
      const tasksByMondayUser = new Map();

      tasks.forEach(task => {
        const peopleColumn = task.column_values.find(col => 
          col.title === 'Person' || col.id === 'person' || 
          col.type === 'multiple-person' || col.type === 'person'
        );

        if (!peopleColumn || !peopleColumn.text) return;

        // Extract emails/names from the people column text
        const assignees = peopleColumn.text.split(',').map(a => a.trim());

        assignees.forEach(assignee => {
          if (!assignee) return;
          
          if (!tasksByMondayUser.has(assignee)) {
            tasksByMondayUser.set(assignee, []);
          }
          tasksByMondayUser.get(assignee).push(task);
        });
      });

      console.log(`Found ${tasksByMondayUser.size} users with tasks`);

      // Convert Monday.com identifiers to Slack user IDs
      const mondayIdentifiers = Array.from(tasksByMondayUser.keys());
      const slackUserMap = await userMappingService.getSlackUserIds(mondayIdentifiers);

      console.log(`Mapped ${slackUserMap.size} users to Slack IDs`);

      // Send summary to each user
      for (const [mondayIdentifier, userTasks] of tasksByMondayUser) {
        try {
          const slackUserId = slackUserMap.get(mondayIdentifier);
          
          if (!slackUserId) {
            console.log(`Skipping summary for ${mondayIdentifier} - no Slack mapping found`);
            continue;
          }

          // Check user preferences
          const prefs = cacheService.getUserPreferences(slackUserId);
          
          if (prefs && !prefs.notifications) {
            console.log(`Skipping summary for ${slackUserId} - notifications disabled`);
            continue;
          }

          await this.sendUserSummary(app, slackUserId, userTasks, mondayIdentifier);
          console.log(`Sent daily summary to ${slackUserId} (${mondayIdentifier})`);
        } catch (error) {
          console.error(`Failed to send summary to ${mondayIdentifier}:`, error);
        }
      }

      console.log('Daily task summary completed');

    } catch (error) {
      console.error('Error sending daily summaries:', error);
    }
  }

  static async sendUserSummary(app, slackUserId, tasks, mondayIdentifier) {
    // Categorize tasks by status
    const pending = tasks.filter(t => {
      const status = t.column_values.find(c => 
        c.type === 'color' || c.id.includes('status') || c.title?.toLowerCase().includes('status')
      );
      const statusText = status?.text?.toLowerCase() || '';
      return statusText !== 'done' && statusText !== 'complete' && statusText !== 'completed';
    });

    const completed = tasks.filter(t => {
      const status = t.column_values.find(c => 
        c.type === 'color' || c.id.includes('status') || c.title?.toLowerCase().includes('status')
      );
      const statusText = status?.text?.toLowerCase() || '';
      return statusText === 'done' || statusText === 'complete' || statusText === 'completed';
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
            text: `*📝 Pending Tasks:*\\n${pending.length}`
          },
          {
            type: 'mrkdwn',
            text: `*✅ Completed:*\\n${completed.length}`
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
        const statusColumn = task.column_values.find(c => 
          c.type === 'color' || c.id.includes('status')
        );
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

    // Send message using Slack user ID
    try {
      await app.client.chat.postMessage({
        channel: slackUserId,  // ✅ Now using Slack user ID!
        blocks,
        text: `📊 Daily Task Summary: ${pending.length} pending, ${completed.length} completed`
      });
    } catch (error) {
      console.error(`Failed to send message to Slack user ${slackUserId}:`, error);
      throw error;
    }
  }
}

module.exports = DailySummary;
