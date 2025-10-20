class CompleteCommand {
  static async handle(command, respond, mondayService, cacheService) {
    const boardId = process.env.MONDAY_BOARD_ID;
    const userId = command.user_id;

    try {
      // Get user's pending tasks
      let tasks = cacheService.getBoardItems(boardId);
      
      if (!tasks) {
        tasks = await mondayService.getBoardItems(boardId);
        cacheService.setBoardItems(boardId, tasks);
      }

      // Filter incomplete tasks assigned to user
      const pendingTasks = tasks.filter(task => {
        const statusColumn = task.column_values.find(col => 
          col.title === 'Status' || col.id === 'status'
        );
        const assigneeColumn = task.column_values.find(col => 
          col.title === 'Person' || col.id === 'person'
        );
        
        const isAssignedToUser = assigneeColumn && assigneeColumn.text?.includes(userId);
        const isNotComplete = statusColumn && statusColumn.text !== 'Done' && statusColumn.text !== 'Complete';
        
        return isAssignedToUser && isNotComplete;
      });

      if (pendingTasks.length === 0) {
        await respond({
          text: '✅ You have no pending tasks to complete!',
          response_type: 'ephemeral'
        });
        return;
      }

      // Build blocks with complete buttons
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📝 Complete Tasks',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Select tasks to mark as complete:`
          }
        },
        {
          type: 'divider'
        }
      ];

      pendingTasks.slice(0, 10).forEach(task => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${task.name}*`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ Complete',
              emoji: true
            },
            style: 'primary',
            value: task.id,
            action_id: `complete_task_${task.id}`
          }
        });
      });

      await respond({
        blocks,
        response_type: 'ephemeral'
      });

    } catch (error) {
      console.error('Error in complete command:', error);
      await respond({
        text: '❌ Failed to load tasks. Please try again.',
        response_type: 'ephemeral'
      });
    }
  }
}

module.exports = CompleteCommand;
