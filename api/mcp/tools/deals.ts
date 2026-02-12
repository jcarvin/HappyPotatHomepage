/**
 * HubSpot Deal Tools for MCP
 * 
 * Provides 5 operations for managing deals:
 * 1. create_deal - Create a new deal
 * 2. update_deal - Update an existing deal
 * 3. get_deal - Retrieve deal by ID
 * 4. search_deals - Search for deals
 * 5. associate_contact_deal - Associate a contact with a deal
 */

import type {
  MCPTool,
  MCPToolResult,
  HubSpotObjectResponse,
  HubSpotSearchResponse,
  HubSpotError,
} from '../types.js';
import {
  createSuccessResult,
  createErrorResult,
  formatHubSpotObject,
  formatSearchResults,
} from '../types.js';

const HUBSPOT_API_BASE = 'https://api.hubapiqa.com';

/**
 * Tool 1: Create Deal
 */
export const createDealTool: MCPTool = {
  name: 'create_deal',
  description: 'Create a new deal in HubSpot CRM. Requires deal name and deal stage. Optionally provide amount, pipeline, closedate, and custom properties.',
  inputSchema: {
    type: 'object',
    properties: {
      dealname: {
        type: 'string',
        description: 'Deal name (required)',
      },
      dealstage: {
        type: 'string',
        description: 'Deal stage ID (required)',
      },
      amount: {
        type: 'number',
        description: 'Deal amount',
      },
      pipeline: {
        type: 'string',
        description: 'Pipeline ID (optional, uses default if not specified)',
      },
      closedate: {
        type: 'string',
        description: 'Close date (format: YYYY-MM-DD)',
      },
    },
    required: ['dealname', 'dealstage'],
  },
};

export async function executeCreateDeal(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.dealname || typeof params.dealname !== 'string') {
      return createErrorResult('dealname is required and must be a string');
    }

    if (!params.dealstage || typeof params.dealstage !== 'string') {
      return createErrorResult('dealstage is required and must be a string');
    }

    // Build properties object
    const properties: Record<string, any> = {
      dealname: params.dealname,
      dealstage: params.dealstage,
    };

    if (params.amount !== undefined) {
      properties.amount = String(params.amount);
    }

    if (params.pipeline) {
      properties.pipeline = String(params.pipeline);
    }

    if (params.closedate) {
      properties.closedate = String(params.closedate);
    }

    // Add any additional custom properties
    for (const [key, value] of Object.entries(params)) {
      if (!['dealname', 'dealstage', 'amount', 'pipeline', 'closedate'].includes(key)) {
        if (value !== undefined && value !== null) {
          properties[key] = String(value);
        }
      }
    }

    // Call HubSpot API
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as HubSpotError;
      return createErrorResult(
        `Failed to create deal: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const deal = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Deal', deal));

  } catch (error) {
    return createErrorResult(
      'Error creating deal',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 2: Update Deal
 */
export const updateDealTool: MCPTool = {
  name: 'update_deal',
  description: 'Update an existing deal in HubSpot CRM. Requires deal ID and at least one property to update.',
  inputSchema: {
    type: 'object',
    properties: {
      dealId: {
        type: 'string',
        description: 'HubSpot deal ID (required)',
      },
      properties: {
        type: 'object',
        description: 'Deal properties to update',
        properties: {
          dealname: { type: 'string' },
          dealstage: { type: 'string' },
          amount: { type: 'number' },
          pipeline: { type: 'string' },
          closedate: { type: 'string' },
        },
      },
    },
    required: ['dealId', 'properties'],
  },
};

export async function executeUpdateDeal(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.dealId) {
      return createErrorResult('dealId is required');
    }

    if (!params.properties || Object.keys(params.properties).length === 0) {
      return createErrorResult('At least one property to update is required');
    }

    // Convert all values to strings for HubSpot
    const properties: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.properties)) {
      if (value !== undefined && value !== null) {
        properties[key] = String(value);
      }
    }

    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${params.dealId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = data as HubSpotError;
      return createErrorResult(
        `Failed to update deal: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const deal = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Deal', deal));

  } catch (error) {
    return createErrorResult(
      'Error updating deal',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 3: Get Deal
 */
export const getDealTool: MCPTool = {
  name: 'get_deal',
  description: 'Retrieve a deal by ID from HubSpot CRM. Optionally specify which properties to retrieve.',
  inputSchema: {
    type: 'object',
    properties: {
      dealId: {
        type: 'string',
        description: 'HubSpot deal ID (required)',
      },
      properties: {
        type: 'array',
        description: 'List of properties to retrieve (optional, returns all if not specified)',
        items: { type: 'string' },
      },
    },
    required: ['dealId'],
  },
};

export async function executeGetDeal(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.dealId) {
      return createErrorResult('dealId is required');
    }

    let url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${params.dealId}`;
    
    // Add properties query param if specified
    if (params.properties && Array.isArray(params.properties) && params.properties.length > 0) {
      const propsParam = params.properties.join(',');
      url += `?properties=${encodeURIComponent(propsParam)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as HubSpotError;
      if (response.status === 404) {
        return createErrorResult(`Deal not found with ID: ${params.dealId}`);
      }
      return createErrorResult(
        `Failed to retrieve deal: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const deal = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Deal', deal));

  } catch (error) {
    return createErrorResult(
      'Error retrieving deal',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 4: Search Deals
 */
export const searchDealsTool: MCPTool = {
  name: 'search_deals',
  description: 'Search for deals in HubSpot CRM. Provide search filters like dealname, dealstage, amount. Returns up to 100 results.',
  inputSchema: {
    type: 'object',
    properties: {
      dealname: {
        type: 'string',
        description: 'Search by deal name',
      },
      dealstage: {
        type: 'string',
        description: 'Filter by deal stage',
      },
      pipeline: {
        type: 'string',
        description: 'Filter by pipeline',
      },
      amount_min: {
        type: 'number',
        description: 'Minimum deal amount',
      },
      amount_max: {
        type: 'number',
        description: 'Maximum deal amount',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10, max: 100)',
      },
    },
  },
};

export async function executeSearchDeals(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    // Build filter groups
    const filterGroups: any[] = [];
    
    if (params.dealname) {
      filterGroups.push({
        filters: [{
          propertyName: 'dealname',
          operator: 'CONTAINS_TOKEN',
          value: params.dealname,
        }],
      });
    }
    
    if (params.dealstage) {
      filterGroups.push({
        filters: [{
          propertyName: 'dealstage',
          operator: 'EQ',
          value: params.dealstage,
        }],
      });
    }
    
    if (params.pipeline) {
      filterGroups.push({
        filters: [{
          propertyName: 'pipeline',
          operator: 'EQ',
          value: params.pipeline,
        }],
      });
    }
    
    if (params.amount_min !== undefined) {
      filterGroups.push({
        filters: [{
          propertyName: 'amount',
          operator: 'GTE',
          value: String(params.amount_min),
        }],
      });
    }
    
    if (params.amount_max !== undefined) {
      filterGroups.push({
        filters: [{
          propertyName: 'amount',
          operator: 'LTE',
          value: String(params.amount_max),
        }],
      });
    }

    if (filterGroups.length === 0) {
      return createErrorResult('At least one search parameter is required');
    }

    const limit = Math.min(Math.max(params.limit || 10, 1), 100);

    const searchBody = {
      filterGroups,
      limit,
      properties: ['dealname', 'dealstage', 'amount', 'pipeline', 'closedate', 'createdate'],
    };

    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as HubSpotError;
      return createErrorResult(
        `Failed to search deals: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const searchResult = data as HubSpotSearchResponse;
    return createSuccessResult(formatSearchResults('deal', searchResult.results));

  } catch (error) {
    return createErrorResult(
      'Error searching deals',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 5: Associate Contact with Deal
 */
export const associateContactDealTool: MCPTool = {
  name: 'associate_contact_deal',
  description: 'Associate a contact with a deal in HubSpot CRM. This creates a relationship between a contact and a deal.',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: {
        type: 'string',
        description: 'HubSpot contact ID (required)',
      },
      dealId: {
        type: 'string',
        description: 'HubSpot deal ID (required)',
      },
    },
    required: ['contactId', 'dealId'],
  },
};

export async function executeAssociateContactDeal(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.contactId) {
      return createErrorResult('contactId is required');
    }

    if (!params.dealId) {
      return createErrorResult('dealId is required');
    }

    // HubSpot v3 API for associations
    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${params.contactId}/associations/deals/${params.dealId}/3`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204 || response.status === 200) {
      return createSuccessResult(
        `Successfully associated contact ${params.contactId} with deal ${params.dealId}`
      );
    }

    const data = await response.json();
    const error = data as HubSpotError;
    
    return createErrorResult(
      `Failed to associate contact with deal: ${error.message}`,
      { status: response.status, error: data }
    );

  } catch (error) {
    return createErrorResult(
      'Error associating contact with deal',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}
