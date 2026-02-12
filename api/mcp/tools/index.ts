/**
 * MCP Tool Registry
 * 
 * Central registry of all MCP tools available to Breeze agents.
 * Exports tool definitions and executors for contact and deal operations.
 */

import type { MCPTool, ToolExecutor, MCPToolResult } from '../types.js';

// Import contact tools
import {
  createContactTool,
  updateContactTool,
  getContactTool,
  searchContactsTool,
  listContactPropertiesTool,
  executeCreateContact,
  executeUpdateContact,
  executeGetContact,
  executeSearchContacts,
  executeListContactProperties,
} from './contacts.js';

// Import deal tools
import {
  createDealTool,
  updateDealTool,
  getDealTool,
  searchDealsTool,
  associateContactDealTool,
  executeCreateDeal,
  executeUpdateDeal,
  executeGetDeal,
  executeSearchDeals,
  executeAssociateContactDeal,
} from './deals.js';

/**
 * Tool registry mapping tool names to definitions and executors
 */
const toolRegistry: Record<string, { definition: MCPTool; executor: ToolExecutor }> = {
  // Contact tools
  create_contact: {
    definition: createContactTool,
    executor: executeCreateContact,
  },
  update_contact: {
    definition: updateContactTool,
    executor: executeUpdateContact,
  },
  get_contact: {
    definition: getContactTool,
    executor: executeGetContact,
  },
  search_contacts: {
    definition: searchContactsTool,
    executor: executeSearchContacts,
  },
  list_contact_properties: {
    definition: listContactPropertiesTool,
    executor: executeListContactProperties,
  },
  
  // Deal tools
  create_deal: {
    definition: createDealTool,
    executor: executeCreateDeal,
  },
  update_deal: {
    definition: updateDealTool,
    executor: executeUpdateDeal,
  },
  get_deal: {
    definition: getDealTool,
    executor: executeGetDeal,
  },
  search_deals: {
    definition: searchDealsTool,
    executor: executeSearchDeals,
  },
  associate_contact_deal: {
    definition: associateContactDealTool,
    executor: executeAssociateContactDeal,
  },
};

/**
 * Get all available tool definitions
 * Called when MCP client requests tools/list
 */
export function getAllTools(): MCPTool[] {
  return Object.values(toolRegistry).map(tool => tool.definition);
}

/**
 * Execute a tool by name
 * Called when MCP client requests tools/call
 * 
 * @param toolName - Name of the tool to execute
 * @param params - Parameters to pass to the tool
 * @param accessToken - HubSpot API access token
 * @returns Tool execution result
 */
export async function executeTool(
  toolName: string,
  params: any,
  accessToken: string
): Promise<MCPToolResult> {
  const tool = toolRegistry[toolName];
  
  if (!tool) {
    return {
      content: [{
        type: 'text',
        text: `Unknown tool: ${toolName}. Available tools: ${Object.keys(toolRegistry).join(', ')}`,
      }],
      isError: true,
    };
  }
  
  try {
    return await tool.executor(params, accessToken);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      content: [{
        type: 'text',
        text: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }],
      isError: true,
    };
  }
}

/**
 * Get a specific tool definition by name
 */
export function getTool(toolName: string): MCPTool | undefined {
  return toolRegistry[toolName]?.definition;
}

/**
 * Check if a tool exists
 */
export function hasTool(toolName: string): boolean {
  return toolName in toolRegistry;
}

/**
 * Get list of all tool names
 */
export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}

/**
 * Get tools by category
 */
export function getContactTools(): MCPTool[] {
  return [
    createContactTool,
    updateContactTool,
    getContactTool,
    searchContactsTool,
    listContactPropertiesTool,
  ];
}

export function getDealTools(): MCPTool[] {
  return [
    createDealTool,
    updateDealTool,
    getDealTool,
    searchDealsTool,
    associateContactDealTool,
  ];
}

/**
 * Get tool count
 */
export function getToolCount(): number {
  return Object.keys(toolRegistry).length;
}
