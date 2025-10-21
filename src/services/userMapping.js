const axios = require('axios');

class UserMappingService {
  constructor(slackClient) {
    this.slackClient = slackClient;
    this.cache = new Map();
  }

  /**
   * Get user's email from Slack (primary method)
   * This is the most reliable way to match Slack users to Monday.com users
   */
  async getSlackUserEmail(slackUserId) {
    // Check cache first
    if (this.cache.has(slackUserId)) {
      return this.cache.get(slackUserId);
    }

    try {
      const result = await this.slackClient.users.info({
        user: slackUserId
      });

      const email = result.user?.profile?.email;
      
      if (email) {
        this.cache.set(slackUserId, email);
        console.log(`Mapped Slack user ${slackUserId} to email: ${email}`);
        return email;
      }

      console.warn(`No email found for Slack user ${slackUserId}`);
      return null;
    } catch (error) {
      console.error('Error fetching Slack user email:', error);
      return null;
    }
  }

  /**
   * Get user's display name from Slack (fallback method)
   */
  async getSlackUserName(slackUserId) {
    try {
      const result = await this.slackClient.users.info({
        user: slackUserId
      });

      const realName = result.user?.real_name;
      const displayName = result.user?.profile?.display_name;
      
      return realName || displayName || null;
    } catch (error) {
      console.error('Error fetching Slack user name:', error);
      return null;
    }
  }

  /**
   * Get Monday.com identifier for a Slack user
   * Returns email (preferred) or name as fallback
   */
  async getMondayIdentifier(slackUserId) {
    const email = await this.getSlackUserEmail(slackUserId);
    if (email) return email;

    // Fallback to name if email not available
    const name = await this.getSlackUserName(slackUserId);
    return name;
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(slackUserId = null) {
    if (slackUserId) {
      this.cache.delete(slackUserId);
    } else {
      this.cache.clear();
    }
  }
}

module.exports = UserMappingService;
