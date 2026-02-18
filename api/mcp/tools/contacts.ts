/**
 * HubSpot Contact Tools for MCP
 * 
 * Provides 5 operations for managing contacts:
 * 1. create_contact - Create a new contact
 * 2. update_contact - Update an existing contact
 * 3. get_contact - Retrieve contact by ID
 * 4. search_contacts - Search for contacts
 * 5. list_contact_properties - Get available contact properties
 */

import type {
  MCPTool,
  MCPToolResult,
  HubSpotObjectResponse,
  HubSpotSearchResponse,
  HubSpotError,
} from '../../../lib/mcp/types.js';
import {
  createSuccessResult,
  createErrorResult,
  formatHubSpotObject,
  formatSearchResults,
} from '../../../lib/mcp/types.js';

const HUBSPOT_API_BASE = 'https://api.hubapiqa.com';

/**
 * Tool 1: Create Contact
 */
export const createContactTool: MCPTool = {
  name: 'create_contact',
  description: 'Create a new contact in HubSpot CRM. Email is required. Optionally provide firstname, lastname, phone, company, and any custom properties.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Contact email address (required)',
      },
      firstname: {
        type: 'string',
        description: 'First name',
      },
      lastname: {
        type: 'string',
        description: 'Last name',
      },
      phone: {
        type: 'string',
        description: 'Phone number',
      },
      company: {
        type: 'string',
        description: 'Company name',
      },
      website: {
        type: 'string',
        description: 'Website URL',
      },
      lifecyclestage: {
        type: 'string',
        description: 'Lifecycle stage (e.g., lead, customer)',
      },
    },
    required: ['email'],
  },
};

export async function executeCreateContact(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    // Validate email
    if (!params.email || typeof params.email !== 'string') {
      return createErrorResult('Email is required and must be a valid string');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.email)) {
      return createErrorResult(`Invalid email format: ${params.email}`);
    }

    // Build properties object
    const properties: Record<string, any> = {};
    const allowedFields = ['email', 'firstname', 'lastname', 'phone', 'company', 'website', 'lifecyclestage'];
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        properties[key] = String(value);
      }
    }

    // Call HubSpot API
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
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
        `Failed to create contact: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const contact = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Contact', contact));

  } catch (error) {
    return createErrorResult(
      'Error creating contact',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 2: Update Contact
 */
export const updateContactTool: MCPTool = {
  name: 'update_contact',
  description: 'Update an existing contact in HubSpot CRM. Requires contact ID and at least one property to update.',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: {
        type: 'string',
        description: 'HubSpot contact ID (required)',
      },
      properties: {
        type: 'object',
        description: 'Contact properties to update',
        properties: {
          email: { type: 'string' },
          firstname: { type: 'string' },
          lastname: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          website: { type: 'string' },
          lifecyclestage: { type: 'string' },
        },
      },
    },
    required: ['contactId', 'properties'],
  },
};

export async function executeUpdateContact(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.contactId) {
      return createErrorResult('contactId is required');
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
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${params.contactId}`,
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
        `Failed to update contact: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const contact = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Contact', contact));

  } catch (error) {
    return createErrorResult(
      'Error updating contact',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 3: Get Contact
 */
export const getContactTool: MCPTool = {
  name: 'get_contact',
  description: 'Retrieve a contact by ID from HubSpot CRM. Optionally specify which properties to retrieve.',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: {
        type: 'string',
        description: 'HubSpot contact ID (required)',
      },
      properties: {
        type: 'array',
        description: 'List of properties to retrieve (optional, returns all if not specified)',
        items: { type: 'string' },
      },
    },
    required: ['contactId'],
  },
};

export async function executeGetContact(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    if (!params.contactId) {
      return createErrorResult('contactId is required');
    }

    let url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${params.contactId}`;
    
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
        return createErrorResult(`Contact not found with ID: ${params.contactId}`);
      }
      return createErrorResult(
        `Failed to retrieve contact: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const contact = data as HubSpotObjectResponse;
    return createSuccessResult(formatHubSpotObject('Contact', contact));

  } catch (error) {
    return createErrorResult(
      'Error retrieving contact',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 4: Search Contacts
 */
export const searchContactsTool: MCPTool = {
  name: 'search_contacts',
  description: 'Search for contacts in HubSpot CRM. Provide search filters like email, firstname, lastname. Returns up to 100 results.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Search by email address',
      },
      firstname: {
        type: 'string',
        description: 'Search by first name',
      },
      lastname: {
        type: 'string',
        description: 'Search by last name',
      },
      company: {
        type: 'string',
        description: 'Search by company name',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10, max: 100)',
      },
    },
  },
};

export async function executeSearchContacts(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    // Build filter groups
    const filterGroups: any[] = [];
    
    if (params.email) {
      filterGroups.push({
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: params.email,
        }],
      });
    }
    
    if (params.firstname) {
      filterGroups.push({
        filters: [{
          propertyName: 'firstname',
          operator: 'CONTAINS_TOKEN',
          value: params.firstname,
        }],
      });
    }
    
    if (params.lastname) {
      filterGroups.push({
        filters: [{
          propertyName: 'lastname',
          operator: 'CONTAINS_TOKEN',
          value: params.lastname,
        }],
      });
    }
    
    if (params.company) {
      filterGroups.push({
        filters: [{
          propertyName: 'company',
          operator: 'CONTAINS_TOKEN',
          value: params.company,
        }],
      });
    }

    if (filterGroups.length === 0) {
      return createErrorResult('At least one search parameter is required (email, firstname, lastname, or company)');
    }

    const limit = Math.min(Math.max(params.limit || 10, 1), 100);

    const searchBody = {
      filterGroups,
      limit,
      properties: ['email', 'firstname', 'lastname', 'company', 'phone', 'createdate'],
    };

    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
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
        `Failed to search contacts: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    const searchResult = data as HubSpotSearchResponse;
    return createSuccessResult(formatSearchResults('contact', searchResult.results));

  } catch (error) {
    return createErrorResult(
      'Error searching contacts',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}

/**
 * Tool 5: List Contact Properties
 */
export const listContactPropertiesTool: MCPTool = {
  name: 'list_contact_properties',
  description: 'Get a list of all available contact properties in HubSpot CRM. Useful for discovering what fields can be used in other contact operations.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export async function executeListContactProperties(
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  try {
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/properties/contacts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as HubSpotError;
      return createErrorResult(
        `Failed to list contact properties: ${error.message}`,
        { status: response.status, error: data }
      );
    }

    // Format properties list
    const properties = data.results || [];
    const formatted = properties
      .slice(0, 50) // Limit to first 50 properties
      .map((prop: any) => `${prop.name}: ${prop.label} (${prop.type})`)
      .join('\n');

    return createSuccessResult(
      `Available Contact Properties (showing ${Math.min(50, properties.length)} of ${properties.length}):\n\n${formatted}`
    );

  } catch (error) {
    return createErrorResult(
      'Error listing contact properties',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
}
