class MondayWebhook {
  static async handle(payload, app, mondayService) {
    try {
      // Handle challenge verification
      if (payload && payload.challenge) {
        return { challenge: payload.challenge };
      }

      // Validate payload exists
      if (!payload) {
        console.log('No payload received');
        return { status: 'ignored' };
      }

      // Extract event data
      const { event } = payload;
      
      if (!event) {
        console.log('No event in webhook payload');
        return { status: 'ignored' };
      }

      // Handle different event types
      switch (event.type) {
        case 'create_item':
          await this.handleItemCreated(event, app, mondayService);
          break;
        
        case 'change_column_value':
          await this.handleColumnChanged(event, app, mondayService);
          break;
        
        case 'create_update':
          await this.handleUpdateCreated(event, app, mondayService);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { status: 'processed' };

    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  static async handleItemCreated(event, app, mondayService) {
    try {
      const { itemId, boardId, itemName } = event;

      // Get item details
      const item = await mondayService.getItem(itemId);
      
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => 
        col.id === 'person' || col.text?.includes('@')
      );

      if (!peopleColumn || !peopleColumn.persons_and_teams) return;

      // Notify assigned users
      for (const person of peopleColumn.persons_and_teams) {
        try {
          await app.client.chat.postMessage({
            channel: person.id,
            text: `📋 New task assigned: *${itemName}*`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `📋 *New Task Assigned*\n\n*${itemName}*`
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'View in Monday.com',
                      emoji: true
                    },
                    url: `https://monday.com/boards/${boardId}/pulses/${itemId}`,
                    action_id: 'view_in_monday'
                  }
                ]
              }
            ]
          });
        } catch (error) {
          console.error(`Failed to notify user ${person.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error handling item created:', error);
    }
  }

  static async handleColumnChanged(event, app, mondayService) {
    try {
      const { itemId, columnId, value, previousValue } = event;

      // Only notify on status changes
      if (columnId !== 'status') return;

      const item = await mondayService.getItem(itemId);
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => col.id === 'person');

      if (!peopleColumn || !peopleColumn.persons_and_teams) return;

      const statusColumn = item.column_values.find(col => col.id === 'status');
      const newStatus = statusColumn?.text || 'Unknown';

      // Notify assigned users of status change
      for (const person of peopleColumn.persons_and_teams) {
        try {
          await app.client.chat.postMessage({
            channel: person.id,
            text: `🔄 Task status updated: *${item.name}* → ${newStatus}`
          });
        } catch (error) {
          console.error(`Failed to notify user ${person.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error handling column changed:', error);
    }
  }

  static async handleUpdateCreated(event, app, mondayService) {
    try {
      const { itemId, updateId, textBody } = event;

      const item = await mondayService.getItem(itemId);
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => col.id === 'person');

      if (!peopleColumn || !peopleColumn.persons_and_teams) return;

      // Notify assigned users of new update
      for (const person of peopleColumn.persons_and_teams) {
        try {
          await app.client.chat.postMessage({
            channel: person.id,
            text: `💬 New comment on *${item.name}*:\n> ${textBody.substring(0, 200)}${textBody.length > 200 ? '...' : ''}`
          });
        } catch (error) {
          console.error(`Failed to notify user ${person.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error handling update created:', error);
    }
  }
}

module.exports = MondayWebhook;
