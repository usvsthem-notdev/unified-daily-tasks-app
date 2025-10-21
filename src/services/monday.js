const axios = require('axios');

class MondayService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.monday.com/v2';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async query(query, variables = {}) {
    try {
      const response = await this.client.post('', {
        query,
        variables
      });

      if (response.data.errors) {
        throw new Error(JSON.stringify(response.data.errors));
      }

      return response.data.data;
    } catch (error) {
      console.error('Monday.com API error:', error.message);
      throw error;
    }
  }

  /**
   * Get all boards the user has access to
   */
  async getAllBoards(limit = 100) {
    const query = `
      query ($limit: Int) {
        boards(limit: $limit) {
          id
          name
          state
          board_kind
        }
      }
    `;
    try {
      const data = await this.query(query, { limit });
      return data.boards || [];
    } catch (error) {
      console.error('Error fetching all boards:', error);
      throw error;
    }
  }

  /**
   * Get tasks from multiple boards in a single query
   */
  async getTasksFromBoards(boardIds, limit = 50) {
    const query = `
      query ($boardIds: [ID!], $limit: Int) {
        boards(ids: $boardIds) {
          id
          name
          columns {
            id
            title
            type
          }
          items_page(limit: $limit) {
            items {
              id
              name
              state
              column_values {
                id
                type
                text
                value
              }
              created_at
              updated_at
            }
          }
        }
      }
    `;
    try {
      const data = await this.query(query, { boardIds, limit });
      return data.boards || [];
    } catch (error) {
      console.error('Error fetching tasks from boards:', error);
      throw error;
    }
  }

  /**
   * Get ALL tasks for a user across ALL boards with classification
   * @param {string} userIdentifier - Email address or name of the user in Monday.com
   */
  async getAllUserTasks(userIdentifier) {
    try {
      console.log(`Fetching all boards for user: ${userIdentifier}...`);
      const boards = await this.getAllBoards();
      
      if (boards.length === 0) {
        console.log('No boards found');
        return { tasks: [], boards: [], classified: this.getEmptyClassification() };
      }

      console.log(`Found ${boards.length} boards`);
      
      // Filter active boards
      const activeBoards = boards.filter(board => 
        board.state === 'active' || board.state === 'all_users'
      );

      console.log(`${activeBoards.length} active boards`);

      if (activeBoards.length === 0) {
        return { tasks: [], boards: [], classified: this.getEmptyClassification() };
      }

      const boardIds = activeBoards.map(b => b.id);

      // Fetch tasks in batches (25 boards at a time)
      const batchSize = 25;
      const allTasks = [];

      for (let i = 0; i < boardIds.length; i += batchSize) {
        const batchIds = boardIds.slice(i, i + batchSize);
        console.log(`Fetching tasks from boards ${i + 1}-${Math.min(i + batchSize, boardIds.length)}...`);
        
        const boardsWithTasks = await this.getTasksFromBoards(batchIds);
        
        // Extract and flatten tasks
        boardsWithTasks.forEach(board => {
          if (board.items_page && board.items_page.items) {
            board.items_page.items.forEach(item => {
              // Enrich column values with titles
              const enrichedItem = {
                ...item,
                board_id: board.id,
                board_name: board.name,
                column_values: item.column_values.map(colVal => {
                  const column = board.columns.find(c => c.id === colVal.id);
                  return {
                    ...colVal,
                    title: column?.title || colVal.id,
                    columnType: column?.type || 'unknown'
                  };
                })
              };
              allTasks.push(enrichedItem);
            });
          }
        });

        // Small delay between batches to respect rate limits
        if (i + batchSize < boardIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Total tasks found: ${allTasks.length}`);

      // Classify tasks
      const classified = this.classifyTasks(allTasks, userIdentifier);

      return {
        tasks: allTasks,
        boards: activeBoards,
        classified
      };

    } catch (error) {
      console.error('Error in getAllUserTasks:', error);
      throw error;
    }
  }

  /**
   * Classify tasks by status, assignee, due date, etc.
   * @param {Array} tasks - Array of task objects
   * @param {string} userIdentifier - Email address or name of the user (NOT Slack user ID!)
   */
  classifyTasks(tasks, userIdentifier) {
    const classifications = {
      myTasks: [],
      overdue: [],
      dueToday: [],
      dueThisWeek: [],
      completed: [],
      unassigned: [],
      allTasks: tasks
    };

    // Normalize user identifier for matching
    const normalizedIdentifier = userIdentifier?.toLowerCase().trim();
    
    console.log(`Classifying tasks for user identifier: ${userIdentifier}`);
    console.log(`Normalized identifier: ${normalizedIdentifier}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    tasks.forEach(task => {
      // Find relevant columns
      const statusColumn = task.column_values.find(cv => 
        cv.type === 'color' || cv.id.includes('status') || cv.title?.toLowerCase().includes('status')
      );
      
      const peopleColumn = task.column_values.find(cv => 
        cv.type === 'multiple-person' || cv.type === 'person' || 
        cv.title?.toLowerCase().includes('person') || cv.title?.toLowerCase().includes('assignee')
      );
      
      const dateColumn = task.column_values.find(cv => 
        cv.type === 'date' || cv.title?.toLowerCase().includes('due')
      );

      // Parse status
      let status = 'unknown';
      if (statusColumn && statusColumn.text) {
        status = statusColumn.text.toLowerCase();
      }

      // CRITICAL FIX: Check if assigned to user using email or name matching
      let isMyTask = false;
      if (peopleColumn && peopleColumn.text && normalizedIdentifier) {
        const assigneeText = peopleColumn.text.toLowerCase().trim();
        
        // Try multiple matching strategies
        // 1. Direct substring match (handles "John Doe" in "John Doe, Jane Smith")
        isMyTask = assigneeText.includes(normalizedIdentifier);
        
        // 2. If identifier looks like email, try extracting username part
        if (!isMyTask && normalizedIdentifier.includes('@')) {
          const emailUsername = normalizedIdentifier.split('@')[0];
          isMyTask = assigneeText.includes(emailUsername);
        }
        
        // 3. If identifier has spaces (is a name), try matching parts
        if (!isMyTask && normalizedIdentifier.includes(' ')) {
          const nameParts = normalizedIdentifier.split(' ');
          isMyTask = nameParts.every(part => assigneeText.includes(part));
        }
        
        // Debug logging for first few tasks
        if (task.id && peopleColumn.text) {
          console.log(`Task "${task.name}": Assignee="${peopleColumn.text}", Match=${isMyTask}`);
        }
      }

      // Parse due date
      let dueDate = null;
      if (dateColumn && dateColumn.value) {
        try {
          const dateData = JSON.parse(dateColumn.value);
          if (dateData.date) {
            dueDate = new Date(dateData.date);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Create enriched task
      const taskInfo = {
        ...task,
        status,
        isMyTask,
        dueDate
      };

      // Classify
      if (isMyTask) {
        classifications.myTasks.push(taskInfo);
      }

      if (status === 'done' || status === 'completed' || status === 'finished') {
        classifications.completed.push(taskInfo);
      }

      if (!peopleColumn || !peopleColumn.text) {
        classifications.unassigned.push(taskInfo);
      }

      // Check due dates (only for incomplete tasks)
      if (dueDate && status !== 'done' && status !== 'completed') {
        if (dueDate < today) {
          classifications.overdue.push(taskInfo);
        } else if (dueDate.toDateString() === today.toDateString()) {
          classifications.dueToday.push(taskInfo);
        } else if (dueDate <= weekFromNow) {
          classifications.dueThisWeek.push(taskInfo);
        }
      }
    });

    // Sort by due date
    const sortByDueDate = (a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    };

    classifications.myTasks.sort(sortByDueDate);
    classifications.overdue.sort(sortByDueDate);
    classifications.dueToday.sort(sortByDueDate);
    classifications.dueThisWeek.sort(sortByDueDate);

    console.log(`Classification complete: ${classifications.myTasks.length} tasks assigned to user`);

    return classifications;
  }

  getEmptyClassification() {
    return {
      myTasks: [],
      overdue: [],
      dueToday: [],
      dueThisWeek: [],
      completed: [],
      unassigned: [],
      allTasks: []
    };
  }

  // Legacy method - kept for backward compatibility
  async getBoards() {
    return this.getAllBoards();
  }

  // Legacy method - kept for backward compatibility
  async getBoardItems(boardId, limit = 50) {
    if (!boardId) {
      console.warn('getBoardItems called without boardId, fetching from all boards instead');
      const result = await this.getAllUserTasks(null);
      return result.tasks;
    }

    const query = `
      query ($boardId: [ID!], $limit: Int) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
          }
          items_page(limit: $limit) {
            items {
              id
              name
              state
              column_values {
                id
                type
                text
                value
              }
              created_at
              updated_at
            }
          }
        }
      }
    `;
    const data = await this.query(query, { boardId: [boardId], limit });
    const board = data.boards[0];
    const items = board?.items_page?.items || [];
    const columns = board?.columns || [];
    
    // Enrich items with column metadata
    return items.map(item => ({
      ...item,
      column_values: item.column_values.map(colVal => {
        const column = columns.find(c => c.id === colVal.id);
        return {
          ...colVal,
          title: column?.title || colVal.id,
          columnType: column?.type || 'unknown'
        };
      })
    }));
  }

  async createItem(boardId, itemName, columnValues = {}) {
    const query = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
        }
      }
    `;
    const data = await this.query(query, {
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues)
    });
    return data.create_item;
  }

  async updateItem(boardId, itemId, columnValues) {
    // CRITICAL FIX: Change JSON to JSON! to match Monday.com API requirement
    const query = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId,
          item_id: $itemId,
          column_values: $columnValues
        ) {
          id
          name
        }
      }
    `;
    const data = await this.query(query, {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues)
    });
    return data.change_multiple_column_values;
  }

  async getItem(itemId) {
    const query = `
      query ($itemId: [ID!]) {
        items(ids: $itemId) {
          id
          name
          state
          board {
            id
            name
            columns {
              id
              title
              type
            }
          }
          column_values {
            id
            type
            text
            value
          }
        }
      }
    `;
    const data = await this.query(query, { itemId: [itemId] });
    const item = data.items[0];
    
    // Enrich with column titles
    if (item && item.board) {
      item.column_values = item.column_values.map(colVal => {
        const column = item.board.columns.find(c => c.id === colVal.id);
        return {
          ...colVal,
          title: column?.title || colVal.id,
          columnType: column?.type || 'unknown'
        };
      });
    }
    
    return item;
  }

  async deleteItem(itemId) {
    const query = `
      mutation ($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `;
    const data = await this.query(query, { itemId });
    return data.delete_item;
  }

  async addUpdate(itemId, body) {
    const query = `
      mutation ($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
          body
        }
      }
    `;
    const data = await this.query(query, { itemId, body });
    return data.create_update;
  }

  /**
   * Get user tasks - now accepts email/name instead of Slack user ID
   * @param {string} boardId - Board ID (optional, if null searches all boards)
   * @param {string} userIdentifier - Email or name of the user in Monday.com
   */
  async getUserTasks(boardId, userIdentifier) {
    // If no boardId provided, fetch from all boards
    if (!boardId) {
      const result = await this.getAllUserTasks(userIdentifier);
      return result.classified.myTasks;
    }

    const query = `
      query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
          }
          items_page {
            items {
              id
              name
              column_values {
                id
                type
                text
                value
                ... on PeopleValue {
                  persons_and_teams {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;
    const data = await this.query(query, { boardId: [boardId] });
    const board = data.boards[0];
    const items = board?.items_page?.items || [];
    const columns = board?.columns || [];
    
    // Enrich items with column metadata
    const enrichedItems = items.map(item => ({
      ...item,
      column_values: item.column_values.map(colVal => {
        const column = columns.find(c => c.id === colVal.id);
        return {
          ...colVal,
          title: column?.title || colVal.id,
          columnType: column?.type || 'unknown'
        };
      })
    }));
    
    // Filter items assigned to user using text matching
    const normalizedIdentifier = userIdentifier?.toLowerCase().trim();
    return enrichedItems.filter(item => {
      const peopleColumn = item.column_values.find(col => 
        col.type === 'multiple-person' || col.type === 'person'
      );
      if (!peopleColumn || !peopleColumn.text) return false;
      
      const assigneeText = peopleColumn.text.toLowerCase().trim();
      return assigneeText.includes(normalizedIdentifier);
    });
  }
}

module.exports = MondayService;
