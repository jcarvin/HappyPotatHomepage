/**
 * Model Context Protocol (MCP) Types
 * 
 * Defines types for the MCP JSON-RPC protocol and tool schemas.
 * Based on the MCP specification for tool calling.
 */

/**
 * MCP JSON-RPC Request
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
  id: string | number | null;
}

/**
 * MCP JSON-RPC Success Response
 */
export interface MCPSuccessResponse {
  jsonrpc: '2.0';
  result: any;
  id: string | number | null;
}

/**
 * MCP JSON-RPC Error Response
 */
export interface MCPErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * MCP Tool Definition
 * Describes what a tool does and what parameters it accepts
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Tool Result
 * What gets returned after executing a tool
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Tool execution function signature
 */
export type ToolExecutor = (
  params: any,
  accessToken: string
) => Promise<MCPToolResult>;

/**
 * Registry of tools with their executors
 */
export interface ToolRegistry {
  [toolName: string]: {
    definition: MCPTool;
    executor: ToolExecutor;
  };
}

/**
 * HubSpot Contact Properties
 */
export interface ContactProperties {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  [key: string]: any; // Allow custom properties
}

/**
 * HubSpot Deal Properties
 */
export interface DealProperties {
  dealname: string;
  amount?: number;
  dealstage: string;
  pipeline?: string;
  closedate?: string;
  [key: string]: any; // Allow custom properties
}

/**
 * HubSpot API Response for object creation/update
 */
export interface HubSpotObjectResponse {
  id: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

/**
 * HubSpot API Search Response
 */
export interface HubSpotSearchResponse {
  total: number;
  results: HubSpotObjectResponse[];
}

/**
 * HubSpot API Error Response
 */
export interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category?: string;
}

/**
 * Create a successful tool result with text content
 */
export function createSuccessResult(text: string): MCPToolResult {
  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}

/**
 * Create an error tool result
 */
export function createErrorResult(errorMessage: string, details?: any): MCPToolResult {
  const text = details 
    ? `${errorMessage}\n\nDetails: ${JSON.stringify(details, null, 2)}`
    : errorMessage;
    
  return {
    content: [{
      type: 'text',
      text,
    }],
    isError: true,
  };
}

/**
 * Format HubSpot object for display
 */
export function formatHubSpotObject(
  objectType: string,
  object: HubSpotObjectResponse
): string {
  const props = Object.entries(object.properties)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n');
    
  return `${objectType} created successfully!\n\nID: ${object.id}\nProperties:\n${props}`;
}

/**
 * Format HubSpot search results
 */
export function formatSearchResults(
  objectType: string,
  results: HubSpotObjectResponse[]
): string {
  if (results.length === 0) {
    return `No ${objectType}s found matching the search criteria.`;
  }
  
  const formatted = results.map((obj, index) => {
    const mainProps = Object.entries(obj.properties)
      .slice(0, 5) // Show first 5 properties
      .map(([key, value]) => `  ${key}: ${value}`)
      .join('\n');
    
    return `${index + 1}. ${objectType} ID: ${obj.id}\n${mainProps}`;
  }).join('\n\n');
  
  return `Found ${results.length} ${objectType}(s):\n\n${formatted}`;
}

/**
 * Standard MCP error codes
 */
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // Custom error codes
  AUTH_ERROR: -32001,
  HUBSPOT_API_ERROR: -32002,
  VALIDATION_ERROR: -32003,
} as const;
