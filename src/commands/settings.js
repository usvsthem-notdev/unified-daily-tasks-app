class SettingsCommand {
  static async handle(command, client, cacheService) {
    const userId = command.user_id;
    const currentPrefs = cacheService.getUserPreferences(userId);

    try {
      const modal = {
        type: 'modal',
        callback_id: 'settings_modal',
        title: {
          type: 'plain_text',
          text: 'Task Settings'
        },
        submit: {
          type: 'plain_text',
          text: 'Save'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Notification Preferences*\nCustomize how you receive task notifications.'
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'input',
            block_id: 'notifications_enabled',
            element: {
              type: 'radio_buttons',
              action_id: 'notifications_radio',
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: currentPrefs.notifications ? 'Enabled' : 'Disabled'
                },
                value: currentPrefs.notifications ? 'enabled' : 'disabled'
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '🔔 Enabled'
                  },
                  value: 'enabled'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '🔕 Disabled'
                  },
                  value: 'disabled'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Task Notifications'
            }
          },
          {
            type: 'input',
            block_id: 'summary_time',
            element: {
              type: 'static_select',
              action_id: 'time_select',
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: currentPrefs.summaryTime
                },
                value: currentPrefs.summaryTime
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: '07:00 AM'
                  },
                  value: '07:00'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '08:00 AM'
                  },
                  value: '08:00'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '09:00 AM'
                  },
                  value: '09:00'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: '10:00 AM'
                  },
                  value: '10:00'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Daily Summary Time'
            }
          },
          {
            type: 'input',
            block_id: 'timezone',
            element: {
              type: 'static_select',
              action_id: 'timezone_select',
              initial_option: {
                text: {
                  type: 'plain_text',
                  text: currentPrefs.timezone
                },
                value: currentPrefs.timezone
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'America/Los_Angeles (PT)'
                  },
                  value: 'America/Los_Angeles'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'America/Denver (MT)'
                  },
                  value: 'America/Denver'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'America/Chicago (CT)'
                  },
                  value: 'America/Chicago'
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'America/New_York (ET)'
                  },
                  value: 'America/New_York'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Timezone'
            }
          }
        ]
      };

      await client.views.open({
        trigger_id: command.trigger_id,
        view: modal
      });

    } catch (error) {
      console.error('Error opening settings modal:', error);
    }
  }
}

module.exports = SettingsCommand;
