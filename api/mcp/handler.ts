/**
 * MCP Server Handler
 * 
 * Main endpoint for the Model Context Protocol server.
 * Handles JSON-RPC requests from HubSpot Breeze agents.
 * 
 * Supported methods:
 * - tools/list: Returns all available tools
 * - tools/call: Executes a specific tool
 * - ping: Health check
 * 
 * Flow:
 * 1. Validate OAuth token from Authorization header
 * 2. Parse JSON-RPC request
 * 3. Route to appropriate handler
 * 4. Return JSON-RPC response
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMCPRequest } from './auth.js';
import { getAllTools, executeTool } from './tools/index.js';
import type { MCPRequest, MCPSuccessResponse, MCPErrorResponse } from '../../lib/mcp/types.js';
import { MCPErrorCodes } from '../../lib/mcp/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Log all incoming request data to help identify what Breeze is sending us
  console.log('🟣 ============================================');
  console.log('🟣 MCP HANDLER REQUEST');
  console.log('🟣 ============================================');
  console.log('📋 Method:', req.method);
  console.log('📋 URL:', req.url);
  console.log('📋 Query:', JSON.stringify(req.query, null, 2));
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('🟣 ============================================');

  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: MCPErrorCodes.INVALID_REQUEST,
        message: 'Method not allowed. Use POST.',
      },
      id: null,
    } as MCPErrorResponse);
  }

  try {
    // Validate MCP OAuth token
    // Check for optional portal header (if HubSpot provides it)
    const portalIdHeader = req.headers['x-hubspot-portal-id'] as string | undefined;
    const authResult = await validateMCPRequest(req.headers.authorization, portalIdHeader);

    if (authResult.success === false) {
      const errorReason = authResult.error;
      console.warn('MCP authentication failed:', errorReason);
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: MCPErrorCodes.AUTH_ERROR,
          message: 'Authentication failed',
          data: { reason: errorReason },
        },
        id: null,
      } as MCPErrorResponse);
    }

    const context = authResult.context;
    console.log('✅ MCP request authenticated:', {
      registration_id: context.registrationId,
      portal_id: context.portalId,
      has_token: !!context.hubspotAccessToken,
    });

    // Parse JSON-RPC request
    const { jsonrpc, method, params, id } = req.body as MCPRequest;

    // Validate JSON-RPC version
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: MCPErrorCodes.INVALID_REQUEST,
          message: 'Invalid JSON-RPC version. Must be "2.0".',
        },
        id: null,
      } as MCPErrorResponse);
    }

    // Route to appropriate method handler
    switch (method) {
      case 'initialize':
        // MCP protocol handshake - client sends capabilities, server responds with its own
        console.log('🤝 MCP initialize handshake');
        return res.status(200).json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'loaded-potat-mcp',
              version: '1.0.0',
            },
          },
          id,
        } as MCPSuccessResponse);

      case 'initialized':
        // Client notification acknowledging the handshake - no meaningful response body needed
        console.log('✅ MCP initialized notification received');
        return res.status(200).json({
          jsonrpc: '2.0',
          result: null,
          id,
        } as MCPSuccessResponse);

      case 'tools/list': {
        // Return all available tools
        const tools = getAllTools();
        console.log(`📋 Returning ${tools.length} available tools`);
        
        return res.status(200).json({
          jsonrpc: '2.0',
          result: { tools },
          id,
        } as MCPSuccessResponse);
      }

      case 'tools/call': {
        // Execute a specific tool
        if (!params || !params.name) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: MCPErrorCodes.INVALID_PARAMS,
              message: 'Missing required parameter: name',
            },
            id,
          } as MCPErrorResponse);
        }

        const toolName = params.name;
        const toolArgs = params.arguments || {};

        console.log(`🔧 Executing tool: ${toolName}`, {
          portal_id: context.portalId,
          args: Object.keys(toolArgs),
        });

        try {
          const result = await executeTool(
            toolName,
            toolArgs,
            context.hubspotAccessToken
          );

          // Check if tool execution resulted in error
          if (result.isError) {
            console.warn(`⚠️ Tool execution error: ${toolName}`);
            return res.status(200).json({
              jsonrpc: '2.0',
              error: {
                code: MCPErrorCodes.HUBSPOT_API_ERROR,
                message: 'Tool execution failed',
                data: result,
              },
              id,
            } as MCPErrorResponse);
          }

          console.log(`✅ Tool executed successfully: ${toolName}`);
          return res.status(200).json({
            jsonrpc: '2.0',
            result,
            id,
          } as MCPSuccessResponse);

        } catch (toolError) {
          console.error(`❌ Tool execution exception: ${toolName}`, toolError);
          return res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: MCPErrorCodes.INTERNAL_ERROR,
              message: 'Tool execution exception',
              data: {
                tool: toolName,
                error: toolError instanceof Error ? toolError.message : 'Unknown error',
              },
            },
            id,
          } as MCPErrorResponse);
        }
      }

      case 'ping':
        // Health check endpoint
        console.log('🏓 Ping received');
        return res.status(200).json({
          jsonrpc: '2.0',
          result: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            portal_id: context.portalId,
          },
          id,
        } as MCPSuccessResponse);

      default:
        // Unknown method
        console.warn(`❓ Unknown method requested: ${method}`);
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: MCPErrorCodes.METHOD_NOT_FOUND,
            message: `Method not found: ${method}`,
            data: {
              available_methods: ['tools/list', 'tools/call', 'ping'],
            },
          },
          id,
        } as MCPErrorResponse);
    }

  } catch (error) {
    // Catch-all error handler
    console.error('❌ MCP handler error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: MCPErrorCodes.INTERNAL_ERROR,
        message: 'Internal server error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      },
      id: null,
    } as MCPErrorResponse);
  }
}
