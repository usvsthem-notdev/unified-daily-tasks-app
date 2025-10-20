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

  async getBoards() {
    const query = `
      query {
        boards {
          id
          name
          description
        }
      }
    `;
    const data = await this.query(query);
    return data.boards;
  }

  async getBoardItems(boardId, limit = 50) {
    const query = `
      query ($boardId: ID!, $limit: Int) {
        boards(ids: [$boardId]) {
          items_page(limit: $limit) {
            items {
              id
              name
              state
              column_values {
                id
                title
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
    const data = await this.query(query, { boardId, limit });
    return data.boards[0]?.items_page?.items || [];
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
    const query = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON) {
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
      query ($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          state
          board {
            id
            name
          }
          column_values {
            id
            title
            text
            value
          }
        }
      }
    `;
    const data = await this.query(query, { itemId });
    return data.items[0];
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

  async getUserTasks(boardId, userId) {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page {
            items {
              id
              name
              column_values {
                id
                title
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
    const data = await this.query(query, { boardId });
    const items = data.boards[0]?.items_page?.items || [];
    
    // Filter items assigned to user
    return items.filter(item => {
      const peopleColumn = item.column_values.find(col => col.persons_and_teams);
      if (!peopleColumn) return false;
      return peopleColumn.persons_and_teams.some(person => person.id === userId);
    });
  }
}

module.exports = MondayService;
