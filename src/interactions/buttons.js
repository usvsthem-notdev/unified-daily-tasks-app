class ButtonHandler {
  static async handleCompleteTask(action, body, client, mondayService) {
    const taskId = action.value;
    const userId = body.user.id;

    try {
      // Update task status in Monday.com
      const boardId = process.env.MONDAY_BOARD_ID;
      await mondayService.updateItem(boardId, taskId, {
        status: { label: 'Done' }
      });

      // Update the message
      await client.chat.postMessage({
        channel: userId,
        text: `✅ Task completed successfully!`,
        thread_ts: body.message?.ts
      });

      // Optionally update the original message to remove the button
      if (body.message) {
        await client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          text: body.message.text,
          blocks: body.message.blocks.map(block => {
            if (block.accessory?.action_id === action.action_id) {
              return {
                ...block,
                accessory: {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '✓ Completed',
                    emoji: true
                  },
                  style: 'primary',
                  action_id: 'completed_readonly'
                }
              };
            }
            return block;
          })
        });
      }

    } catch (error) {
      console.error('Error completing task:', error);
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: userId,
        text: '❌ Failed to complete task. Please try again.'
      });
    }
  }

  static async handleViewTask(action, body, client, mondayService) {
    const taskId = action.value;

    try {
      // Get task details from Monday.com
      const task = await mondayService.getItem(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      // Format task details
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: task.name,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: []
        }
      ];

      // Add column values as fields
      task.column_values.forEach(col => {
        if (col.text && col.title) {
          blocks[1].fields.push({
            type: 'mrkdwn',
            text: `*${col.title}:*\n${col.text}`
          });
        }
      });

      // Send as ephemeral message
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        blocks
      });

    } catch (error) {
      console.error('Error viewing task:', error);
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: '❌ Failed to load task details.'
      });
    }
  }

  static async handleUpdateTask(action, body, client, mondayService) {
    const taskId = action.value;

    try {
      // Get current task details
      const task = await mondayService.getItem(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      // Open update modal
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'update_task_modal',
          title: {
            type: 'plain_text',
            text: 'Update Task'
          },
          submit: {
            type: 'plain_text',
            text: 'Update'
          },
          blocks: [
            {
              type: 'input',
              block_id: 'task_id',
              element: {
                type: 'plain_text_input',
                action_id: 'task_id_input',
                initial_value: taskId
              },
              label: {
                type: 'plain_text',
                text: 'Task ID'
              }
            },
            {
              type: 'input',
              block_id: 'task_name',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'name_input',
                initial_value: task.name
              },
              label: {
                type: 'plain_text',
                text: 'Task Name'
              }
            },
            {
              type: 'input',
              block_id: 'task_status',
              optional: true,
              element: {
                type: 'static_select',
                action_id: 'status_select',
                options: [
                  {
                    text: { type: 'plain_text', text: 'Not Started' },
                    value: 'not_started'
                  },
                  {
                    text: { type: 'plain_text', text: 'In Progress' },
                    value: 'in_progress'
                  },
                  {
                    text: { type: 'plain_text', text: 'Complete' },
                    value: 'complete'
                  },
                  {
                    text: { type: 'plain_text', text: 'Stuck' },
                    value: 'stuck'
                  }
                ]
              },
              label: {
                type: 'plain_text',
                text: 'Status'
              }
            }
          ]
        }
      });

    } catch (error) {
      console.error('Error opening update modal:', error);
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: body.user.id,
        text: '❌ Failed to open update form.'
      });
    }
  }
}

module.exports = ButtonHandler;
