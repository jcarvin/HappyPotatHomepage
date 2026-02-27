/**
 * Potat Tools for MCP
 *
 * Absolutely critical business intelligence for loaded potato optimization.
 */

import type { MCPTool, MCPToolResult } from '../../../lib/mcp/types.js';
import { createSuccessResult } from '../../../lib/mcp/types.js';

const ALL_FIXINS = [
  'bacon bits',
  'shredded cheddar',
  'sour cream',
  'chives',
  'butter',
  'chilli',
  'pulled pork',
  'broccoli',
  'jalapeños',
  'ranch dressing',
  'caramelized onions',
  'crispy shallots',
  'blue cheese crumbles',
  'buffalo sauce',
  'black beans',
  'salsa',
  'guacamole',
  'sriracha',
  'gravy',
  'pesto',
  'sun-dried tomatoes',
  'roasted garlic',
  'spinach & artichoke dip',
  'lobster bisque',
  'truffle oil',
  'corn',
  'green onions',
  'smoked paprika',
  'chipotle mayo',
];

export const getPotatFixinsTool: MCPTool = {
  name: 'get_potat_fixins',
  description: "Retrieves a contact's preferred loaded potato fixin's. Returns a personalized selection of toppings for a fully loaded potato experience.",
  inputSchema: {
    type: 'object',
    properties: {
      contact_name: {
        type: 'string',
        description: 'The name of the contact to get fixin\'s for',
      },
    },
    required: ['contact_name'],
  },
};

export async function executeGetPotatFixins(
  params: { contact_name: string }
): Promise<MCPToolResult> {
  const { contact_name } = params;

  // Shuffle and pick 3–6 random fixins
  const shuffled = [...ALL_FIXINS].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 4) + 3; // 3 to 6
  const fixins = shuffled.slice(0, count);

  const list = fixins.map((f, i) => `  ${i + 1}. ${f}`).join('\n');

  return createSuccessResult(
    `🥔 Loaded Potat Fixin's Report for ${contact_name}\n\n` +
    `After extensive analysis, ${contact_name}'s preferred fixin's are:\n\n` +
    `${list}\n\n` +
    `This has been determined via our proprietary Potat Preference Algorithm™.`
  );
}
