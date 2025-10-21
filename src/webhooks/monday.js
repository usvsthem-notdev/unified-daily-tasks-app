class MondayWebhook {
  static async handle(payload, app, mondayService, userMappingService) {
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
          await this.handleItemCreated(event, app, mondayService, userMappingService);
          break;
        
        case 'change_column_value':
          await this.handleColumnChanged(event, app, mondayService, userMappingService);
          break;
        
        case 'create_update':
          await this.handleUpdateCreated(event, app, mondayService, userMappingService);
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

  /**
   * Extract assignee identifiers from a people column
   */
  static extractAssignees(peopleColumn) {
    if (!peopleColumn || !peopleColumn.text) return [];

    // The text field contains comma-separated names/emails
    return peopleColumn.text.split(',').map(a => a.trim()).filter(a => a);
  }

  static async handleItemCreated(event, app, mondayService, userMappingService) {
    try {
      const { itemId, boardId, itemName } = event;

      // Get item details
      const item = await mondayService.getItem(itemId);
      
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => 
        col.type === 'multiple-person' || col.type === 'person' ||
        col.id === 'person' || col.title?.toLowerCase().includes('person')
      );

      const assignees = this.extractAssignees(peopleColumn);

      if (assignees.length === 0) {
        console.log(`No assignees found for item ${itemId}`);
        return;
      }

      console.log(`Found ${assignees.length} assignees for new item: ${assignees.join(', ')}`);

      // Convert Monday identifiers to Slack user IDs
      const slackUserMap = await userMappingService.getSlackUserIds(assignees);

      // Notify assigned users
      for (const assignee of assignees) {
        const slackUserId = slackUserMap.get(assignee);
        
        if (!slackUserId) {
          console.log(`Skipping notification for ${assignee} - no Slack mapping`);
          continue;
        }

        try {
          await app.client.chat.postMessage({
            channel: slackUserId,  // ✅ Now using Slack user ID!
            text: `📋 New task assigned: *${itemName}*`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `📋 *New Task Assigned*\\n\\n*${itemName}*`
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
          console.log(`Sent notification to ${slackUserId} (${assignee})`);
        } catch (error) {
          console.error(`Failed to notify Slack user ${slackUserId} (${assignee}):`, error);
        }
      }

    } catch (error) {
      console.error('Error handling item created:', error);
    }
  }

  static async handleColumnChanged(event, app, mondayService, userMappingService) {
    try {
      const { itemId, columnId, value, previousValue } = event;

      // Only notify on status changes
      if (!columnId || !columnId.includes('status')) {
        console.log(`Skipping non-status column change: ${columnId}`);
        return;
      }

      const item = await mondayService.getItem(itemId);
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => 
        col.type === 'multiple-person' || col.type === 'person'
      );

      const assignees = this.extractAssignees(peopleColumn);

      if (assignees.length === 0) return;

      const statusColumn = item.column_values.find(col => 
        col.type === 'color' || col.id.includes('status')
      );
      const newStatus = statusColumn?.text || 'Unknown';

      console.log(`Status changed for item ${itemId}: ${newStatus}, notifying ${assignees.length} users`);

      // Convert Monday identifiers to Slack user IDs
      const slackUserMap = await userMappingService.getSlackUserIds(assignees);

      // Notify assigned users of status change
      for (const assignee of assignees) {
        const slackUserId = slackUserMap.get(assignee);
        
        if (!slackUserId) {
          console.log(`Skipping notification for ${assignee} - no Slack mapping`);
          continue;
        }

        try {
          await app.client.chat.postMessage({
            channel: slackUserId,  // ✅ Now using Slack user ID!
            text: `🔄 Task status updated: *${item.name}* → ${newStatus}`
          });
        } catch (error) {
          console.error(`Failed to notify Slack user ${slackUserId} (${assignee}):`, error);
        }
      }

    } catch (error) {
      console.error('Error handling column changed:', error);
    }
  }

  static async handleUpdateCreated(event, app, mondayService, userMappingService) {
    try {
      const { itemId, updateId, textBody } = event;

      const item = await mondayService.getItem(itemId);
      if (!item) return;

      // Find assigned users
      const peopleColumn = item.column_values.find(col => 
        col.type === 'multiple-person' || col.type === 'person'
      );

      const assignees = this.extractAssignees(peopleColumn);

      if (assignees.length === 0) return;

      console.log(`New comment on item ${itemId}, notifying ${assignees.length} users`);

      // Convert Monday identifiers to Slack user IDs
      const slackUserMap = await userMappingService.getSlackUserIds(assignees);

      // Notify assigned users of new update
      for (const assignee of assignees) {
        const slackUserId = slackUserMap.get(assignee);
        
        if (!slackUserId) {
          console.log(`Skipping notification for ${assignee} - no Slack mapping`);
          continue;
        }

        try {
          await app.client.chat.postMessage({
            channel: slackUserId,  // ✅ Now using Slack user ID!
            text: `💬 New comment on *${item.name}*:\\n> ${textBody.substring(0, 200)}${textBody.length > 200 ? '...' : ''}`
          });
        } catch (error) {
          console.error(`Failed to notify Slack user ${slackUserId} (${assignee}):`, error);
        }
      }

    } catch (error) {
      console.error('Error handling update created:', error);
    }
  }
}

module.exports = MondayWebhook;
