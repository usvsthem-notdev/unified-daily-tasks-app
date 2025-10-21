class TasksCommand {
  static async handle(command, client, respond, mondayService, cacheService) {
    const startTime = Date.now();
    const userId = command.user_id;

    try {
      // Send immediate acknowledgment
      await respond({
        text: '⏳ Fetching your tasks from all boards...',
        response_type: 'ephemeral'
      });

      // Fetch tasks from ALL boards
      const result = await mondayService.getAllUserTasks(userId);
      const { classified } = result;
      const { myTasks, overdue, dueToday, dueThisWeek, completed } = classified;

      if (myTasks.length === 0) {
        await respond({
          text: '📋 You have no tasks assigned to you across any boards.',
          response_type: 'ephemeral',
          replace_original: true
        });
        return;
      }

      // Build task list with classification
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Your Tasks Across All Boards',
            emoji: true
          }
        }
      ];

      // Overdue tasks section
      if (overdue.length > 0) {
        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🚨 Overdue (${overdue.length})*`
            }
          }
        );
        
        overdue.slice(0, 5).forEach(task => {
          const dueDateStr = task.dueDate ? task.dueDate.toLocaleDateString() : 'No date';
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• *${task.name}* - _${task.board_name}_\n  Due: ${dueDateStr}`
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

        if (overdue.length > 5) {
          blocks.push({
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: `_...and ${overdue.length - 5} more overdue tasks_`
            }]
          });
        }
      }

      // Due today section
      if (dueToday.length > 0) {
        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📅 Due Today (${dueToday.length})*`
            }
          }
        );
        
        dueToday.slice(0, 5).forEach(task => {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• *${task.name}* - _${task.board_name}_`
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

        if (dueToday.length > 5) {
          blocks.push({
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: `_...and ${dueToday.length - 5} more due today_`
            }]
          });
        }
      }

      // Due this week section
      if (dueThisWeek.length > 0) {
        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📆 Due This Week (${dueThisWeek.length})*`
            }
          }
        );
        
        dueThisWeek.slice(0, 5).forEach(task => {
          const dueDateStr = task.dueDate ? task.dueDate.toLocaleDateString() : 'No date';
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `• *${task.name}* - _${task.board_name}_\n  Due: ${dueDateStr}`
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

        if (dueThisWeek.length > 5) {
          blocks.push({
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: `_...and ${dueThisWeek.length - 5} more due this week_`
            }]
          });
        }
      }

      // Other tasks (no specific due date)
      const otherTasks = myTasks.filter(t => 
        !overdue.includes(t) && !dueToday.includes(t) && !dueThisWeek.includes(t)
      );

      if (otherTasks.length > 0) {
        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*📌 Other Tasks (${otherTasks.length})*`
            }
          }
        );
        
        otherTasks.slice(0, 3).forEach(task => {
          const statusEmoji = this.getStatusEmoji(task.status);
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${statusEmoji} *${task.name}* - _${task.board_name}_`
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

        if (otherTasks.length > 3) {
          blocks.push({
            type: 'context',
            elements: [{
              type: 'mrkdwn',
              text: `_...and ${otherTasks.length - 3} more tasks_`
            }]
          });
        }
      }

      // Summary footer
      blocks.push(
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📊 *Total:* ${myTasks.length} tasks | *Completed:* ${completed.length} | *Boards:* ${result.boards.length}`
            }
          ]
        }
      );

      await respond({
        blocks,
        response_type: 'ephemeral',
        replace_original: true
      });

      const duration = Date.now() - startTime;
      console.log(`Tasks command completed in ${duration}ms - Found ${myTasks.length} tasks across ${result.boards.length} boards`);

    } catch (error) {
      console.error('Error in tasks command:', error);
      await respond({
        text: '❌ Failed to retrieve tasks from Monday.com. Please try again.\n' +
              'If this persists, contact support.',
        response_type: 'ephemeral',
        replace_original: true
      });
    }
  }

  static getStatusEmoji(status) {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('done') || statusLower.includes('complete')) return '✅';
    if (statusLower.includes('working') || statusLower.includes('progress')) return '🔄';
    if (statusLower.includes('stuck') || statusLower.includes('blocked')) return '🚫';
    if (statusLower.includes('review')) return '👀';
    if (statusLower === 'unknown' || statusLower === '') return '⚪';
    
    return '📌';
  }
}

module.exports = TasksCommand;
