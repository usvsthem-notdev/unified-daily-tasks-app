class QuickCommand {
  static async handle(command, respond, mondayService) {
    const taskName = command.text.trim();
    
    if (!taskName) {
      await respond({
        text: '⚠️ Please provide a task name. Example: `/task-quick Review design mockups`',
        response_type: 'ephemeral'
      });
      return;
    }

    try {
      const boardId = process.env.MONDAY_BOARD_ID;
      
      const task = await mondayService.createItem(boardId, taskName, {
        status: { label: 'Not Started' },
        person: { personsAndTeams: [{ id: command.user_id, kind: 'person' }] }
      });

      await respond({
        text: `✅ Task created: *${taskName}*`,
        response_type: 'ephemeral'
      });

    } catch (error) {
      console.error('Error creating quick task:', error);
      await respond({
        text: '❌ Failed to create task. Please try again.',
        response_type: 'ephemeral'
      });
    }
  }
}

module.exports = QuickCommand;
