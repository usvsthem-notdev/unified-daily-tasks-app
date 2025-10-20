class UpdateCommand {
  static async handle(command, client, respond, mondayService) {
    try {
      const modal = {
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
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'task_id',
            element: {
              type: 'plain_text_input',
              action_id: 'task_id_input',
              placeholder: {
                type: 'plain_text',
                text: 'Enter task ID'
              }
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
              placeholder: {
                type: 'plain_text',
                text: 'New task name (optional)'
              }
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
              placeholder: {
                type: 'plain_text',
                text: 'Update status (optional)'
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '⚪ Not Started'
                  },
                  value: 'not_started'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '🔵 In Progress'
                  },
                  value: 'in_progress'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '✅ Complete'
                  },
                  value: 'complete'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '🚫 Stuck'
                  },
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
      };

      await client.views.open({
        trigger_id: command.trigger_id,
        view: modal
      });

    } catch (error) {
      console.error('Error opening update task modal:', error);
      await respond({
        text: '❌ Failed to open update form. Please try again.',
        response_type: 'ephemeral'
      });
    }
  }
}

module.exports = UpdateCommand;
