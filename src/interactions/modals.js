class ModalHandler {
  static async handleCreateTask(ack, body, view, client, mondayService) {
    const values = view.state.values;
    
    try {
      // Extract form data
      const taskName = values.task_name.name_input.value;
      const description = values.task_description?.description_input?.value || '';
      const priority = values.task_priority.priority_select.selected_option.value;
      const dueDate = values.task_due_date?.due_date_picker?.selected_date || null;

      // Acknowledge submission
      await ack();

      // Create task in Monday.com
      const boardId = process.env.MONDAY_BOARD_ID;
      const columnValues = {
        status: { label: 'Not Started' }
      };

      if (priority) {
        columnValues.priority = { label: priority };
      }

      if (dueDate) {
        columnValues.date = { date: dueDate };
      }

      const task = await mondayService.createItem(boardId, taskName, columnValues);

      // Send success message
      await client.chat.postMessage({
        channel: body.user.id,
        text: `✅ Task created successfully: *${taskName}*`
      });

    } catch (error) {
      console.error('Error handling create task modal:', error);
      await ack({
        response_action: 'errors',
        errors: {
          task_name: 'Failed to create task. Please try again.'
        }
      });
    }
  }

  static async handleUpdateTask(ack, body, view, client, mondayService) {
    const values = view.state.values;
    
    try {
      const taskId = values.task_id.task_id_input.value;
      const taskName = values.task_name?.name_input?.value;
      const status = values.task_status?.status_select?.selected_option?.value;

      await ack();

      const boardId = process.env.MONDAY_BOARD_ID;
      const columnValues = {};

      if (status) {
        const statusMap = {
          'not_started': 'Not Started',
          'in_progress': 'Working on it',
          'complete': 'Done',
          'stuck': 'Stuck'
        };
        columnValues.status = { label: statusMap[status] };
      }

      await mondayService.updateItem(boardId, taskId, columnValues);

      await client.chat.postMessage({
        channel: body.user.id,
        text: `✅ Task updated successfully!`
      });

    } catch (error) {
      console.error('Error handling update task modal:', error);
      await ack({
        response_action: 'errors',
        errors: {
          task_id: 'Failed to update task. Please check the task ID.'
        }
      });
    }
  }

  static async handleSettings(ack, body, view, cacheService) {
    const values = view.state.values;
    const userId = body.user.id;

    try {
      const notifications = values.notifications_enabled.notifications_radio.selected_option.value === 'enabled';
      const summaryTime = values.summary_time.time_select.selected_option.value;
      const timezone = values.timezone.timezone_select.selected_option.value;

      await ack();

      // Save preferences
      cacheService.setUserPreferences(userId, {
        notifications,
        summaryTime,
        timezone
      });

      // Send confirmation - use body.view.id to get the correct user context
      await client.chat.postMessage({
        channel: userId,
        text: '✅ Settings saved successfully!'
      });

    } catch (error) {
      console.error('Error saving settings:', error);
      await ack();
    }
  }
}

module.exports = ModalHandler;
