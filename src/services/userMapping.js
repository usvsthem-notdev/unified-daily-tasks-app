const axios = require('axios');

class UserMappingService {
  constructor(slackClient) {
    this.slackClient = slackClient;
    this.slackToMondayCache = new Map(); // Slack ID → Monday identifier
    this.mondayToSlackCache = new Map(); // Monday identifier → Slack ID
  }

  /**
   * Get user's email from Slack (primary method)
   * This is the most reliable way to match Slack users to Monday.com users
   */
  async getSlackUserEmail(slackUserId) {
    // Check cache first
    if (this.slackToMondayCache.has(slackUserId)) {
      return this.slackToMondayCache.get(slackUserId);
    }

    try {
      const result = await this.slackClient.users.info({
        user: slackUserId
      });

      const email = result.user?.profile?.email;
      
      if (email) {
        this.slackToMondayCache.set(slackUserId, email);
        // Also cache reverse mapping
        this.mondayToSlackCache.set(email.toLowerCase(), slackUserId);
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
   * NEW: Get Slack user ID from Monday.com identifier (email or name)
   * This is the reverse lookup needed for notifications
   */
  async getSlackUserId(mondayIdentifier) {
    if (!mondayIdentifier) return null;

    const normalized = mondayIdentifier.toLowerCase().trim();
    
    // Check cache first
    if (this.mondayToSlackCache.has(normalized)) {
      return this.mondayToSlackCache.get(normalized);
    }

    // Need to search all Slack users to find matching email/name
    try {
      const result = await this.slackClient.users.list({
        limit: 1000
      });

      for (const user of result.members) {
        if (user.is_bot || user.deleted) continue;

        const email = user.profile?.email?.toLowerCase();
        const realName = user.real_name?.toLowerCase();
        const displayName = user.profile?.display_name?.toLowerCase();

        // Match by email (most reliable)
        if (email && email === normalized) {
          this.mondayToSlackCache.set(normalized, user.id);
          this.slackToMondayCache.set(user.id, email);
          console.log(`Reverse mapped ${mondayIdentifier} to Slack user ${user.id}`);
          return user.id;
        }

        // Match by name (fallback)
        if ((realName && realName === normalized) || 
            (displayName && displayName === normalized)) {
          this.mondayToSlackCache.set(normalized, user.id);
          console.log(`Reverse mapped ${mondayIdentifier} (by name) to Slack user ${user.id}`);
          return user.id;
        }
      }

      console.warn(`No Slack user found for Monday identifier: ${mondayIdentifier}`);
      return null;

    } catch (error) {
      console.error('Error searching Slack users:', error);
      return null;
    }
  }

  /**
   * NEW: Batch get Slack user IDs from multiple Monday identifiers
   * More efficient than individual lookups
   */
  async getSlackUserIds(mondayIdentifiers) {
    const results = new Map();
    const uncachedIdentifiers = [];

    // Check cache first
    for (const identifier of mondayIdentifiers) {
      const normalized = identifier?.toLowerCase().trim();
      if (!normalized) continue;

      if (this.mondayToSlackCache.has(normalized)) {
        results.set(identifier, this.mondayToSlackCache.get(normalized));
      } else {
        uncachedIdentifiers.push(identifier);
      }
    }

    // If all cached, return immediately
    if (uncachedIdentifiers.length === 0) {
      return results;
    }

    // Fetch all Slack users once and match
    try {
      const slackUsers = await this.slackClient.users.list({
        limit: 1000
      });

      for (const identifier of uncachedIdentifiers) {
        const normalized = identifier.toLowerCase().trim();

        for (const user of slackUsers.members) {
          if (user.is_bot || user.deleted) continue;

          const email = user.profile?.email?.toLowerCase();
          const realName = user.real_name?.toLowerCase();

          if (email === normalized || realName === normalized) {
            results.set(identifier, user.id);
            this.mondayToSlackCache.set(normalized, user.id);
            this.slackToMondayCache.set(user.id, identifier);
            break;
          }
        }
      }

    } catch (error) {
      console.error('Error batch fetching Slack user IDs:', error);
    }

    return results;
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(identifier = null) {
    if (identifier) {
      this.slackToMondayCache.delete(identifier);
      this.mondayToSlackCache.delete(identifier);
    } else {
      this.slackToMondayCache.clear();
      this.mondayToSlackCache.clear();
    }
  }
}

module.exports = UserMappingService;
