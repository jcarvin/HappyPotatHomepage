/**
 * MCP Tool Registry
 *
 * Central registry of all MCP tools available to Breeze agents.
 * Exports tool definitions and executors for contact and deal operations.
 */

import type { MCPTool, ToolExecutor, MCPToolResult } from '../../../lib/mcp/types.js';
import { createSuccessResult } from '../../../lib/mcp/types.js';

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

// ---------------------------------------------------------------------------
// Potat tool (inlined — no external deps, no need for its own file)
// ---------------------------------------------------------------------------

const ALL_FIXINS = [
  'bacon bits', 'shredded cheddar', 'sour cream', 'chives', 'butter',
  'chilli', 'pulled pork', 'broccoli', 'jalapeños', 'ranch dressing',
  'caramelized onions', 'crispy shallots', 'blue cheese crumbles',
  'buffalo sauce', 'black beans', 'salsa', 'guacamole', 'sriracha',
  'gravy', 'pesto', 'sun-dried tomatoes', 'roasted garlic',
  'spinach & artichoke dip', 'lobster bisque', 'truffle oil', 'corn',
  'green onions', 'smoked paprika', 'chipotle mayo',
];

const getPotatFixinsTool: MCPTool = {
  name: 'get_potat_fixins',
  description: "Retrieves a contact's preferred loaded potato fixin's. Returns a personalized selection of toppings for a fully loaded potato experience.",
  inputSchema: {
    type: 'object',
    properties: {
      contact_name: {
        type: 'string',
        description: "The name of the contact to get fixin's for",
      },
    },
    required: ['contact_name'],
  },
};

async function executeGetPotatFixins(params: { contact_name: string }): Promise<MCPToolResult> {
  const { contact_name } = params;
  const shuffled = [...ALL_FIXINS].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 4) + 3;
  const fixins = shuffled.slice(0, count);
  const list = fixins.map((f, i) => `  ${i + 1}. ${f}`).join('\n');
  return createSuccessResult(
    `🥔 Loaded Potat Fixin's Report for ${contact_name}\n\n` +
    `After extensive analysis, ${contact_name}'s preferred fixin's are:\n\n` +
    `${list}\n\n` +
    `This has been determined via our proprietary Potat Preference Algorithm™.`
  );
}

// ---------------------------------------------------------------------------

/**
 * Tool registry mapping tool names to definitions and executors
 */
const toolRegistry: Record<string, { definition: MCPTool; executor: ToolExecutor }> = {
  // Potat tools
  get_potat_fixins: {
    definition: getPotatFixinsTool,
    executor: (params) => executeGetPotatFixins(params),
  },

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
  params: Record<string, unknown>,
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
