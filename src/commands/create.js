class CreateCommand {
  static async handle(command, client, respond, mondayService) {
    try {
      // Open modal for task creation
      const modal = {
        type: 'modal',
        callback_id: 'create_task_modal',
        title: {
          type: 'plain_text',
          text: 'Create New Task'
        },
        submit: {
          type: 'plain_text',
          text: 'Create'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'task_name',
            element: {
              type: 'plain_text_input',
              action_id: 'name_input',
              placeholder: {
                type: 'plain_text',
                text: 'Enter task name'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Task Name'
            }
          },
          {
            type: 'input',
            block_id: 'task_description',
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Enter task description (optional)'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Description'
            }
          },
          {
            type: 'input',
            block_id: 'task_priority',
            element: {
              type: 'static_select',
              action_id: 'priority_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select priority'
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '🔴 High'
                  },
                  value: 'high'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '🟡 Medium'
                  },
                  value: 'medium'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '🟢 Low'
                  },
                  value: 'low'
                }
              ],
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: '🟡 Medium'
                },
                value: 'medium'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Priority'
            }
          },
          {
            type: 'input',
            block_id: 'task_due_date',
            optional: true,
            element: {
              type: 'datepicker',
              action_id: 'due_date_picker',
              placeholder: {
                type: 'plain_text',
                text: 'Select a due date'
              }
            },
            label: {
              type: 'plain_text',
              text: 'Due Date'
            }
          }
        ]
      };

      if (client) {
        await client.views.open({
          trigger_id: command.trigger_id,
          view: modal
        });
      }

    } catch (error) {
      console.error('Error opening create task modal:', error);
      if (respond) {
        await respond({
          text: '❌ Failed to open task creation form. Please try again.',
          response_type: 'ephemeral'
        });
      }
    }
  }
}

module.exports = CreateCommand;
