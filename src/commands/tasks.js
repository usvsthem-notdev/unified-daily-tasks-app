class TasksCommand {
  static async handle(command, client, respond, mondayService, cacheService) {
    const startTime = Date.now();
    const userId = command.user_id;
    const boardId = process.env.MONDAY_BOARD_ID;

    try {
      // Send immediate acknowledgment
      await respond({
        text: '⏳ Fetching your tasks...',
        response_type: 'ephemeral'
      });

      // Check cache first
      let tasks = cacheService.getBoardItems(boardId);
      
      if (!tasks) {
        tasks = await mondayService.getBoardItems(boardId);
        cacheService.setBoardItems(boardId, tasks);
      }

      // Filter user's tasks - now uses enriched column data
      const userTasks = tasks.filter(task => {
        const assigneeColumn = task.column_values.find(col => 
          col.title === 'Person' || col.id === 'person' || col.columnType === 'people'
        );
        return assigneeColumn && assigneeColumn.text?.includes(userId);
      });

      if (userTasks.length === 0) {
        await respond({
          text: '📋 You have no tasks assigned to you.',
          response_type: 'ephemeral',
          replace_original: true
        });
        return;
      }

      // Build task list
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Your Tasks',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You have *${userTasks.length}* task${userTasks.length > 1 ? 's' : ''} assigned.`
          }
        },
        {
          type: 'divider'
        }
      ];

      // Add each task
      userTasks.slice(0, 10).forEach(task => {
        const statusColumn = task.column_values.find(col => 
          col.title === 'Status' || col.id === 'status' || col.columnType === 'status'
        );
        const status = statusColumn?.text || 'No Status';
        const statusEmoji = this.getStatusEmoji(status);

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} *${task.name}*\n_Status: ${status}_`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ Complete',
              emoji: true
            },
            value: task.id,
            action_id: `complete_task_${task.id}`
          }
        });
      });

      if (userTasks.length > 10) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Showing 10 of ${userTasks.length} tasks_`
            }
          ]
        });
      }

      await respond({
        blocks,
        response_type: 'ephemeral',
        replace_original: true
      });

      const duration = Date.now() - startTime;
      console.log(`Tasks command completed in ${duration}ms`);

    } catch (error) {
      console.error('Error in tasks command:', error);
      await respond({
        text: '❌ Failed to retrieve tasks. Please try again.',
        response_type: 'ephemeral',
        replace_original: true
      });
    }
  }

  static getStatusEmoji(status) {
    const statusMap = {
      'Done': '✅',
      'Working on it': '🔄',
      'Stuck': '🚫',
      'Not Started': '⚪',
      'In Progress': '🔵',
      'Complete': '✅'
    };
    return statusMap[status] || '📌';
  }
}

module.exports = TasksCommand;
