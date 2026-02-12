/**
 * OAuth 2.0 Authorization Server Metadata
 * 
 * RFC 8414: OAuth 2.0 Authorization Server Metadata
 * https://datatracker.ietf.org/doc/html/rfc8414
 * 
 * This endpoint is fetched by HubSpot's UnifiedAuth to discover
 * the OAuth endpoints for this MCP server.
 * 
 * Example from Notion MCP:
 * UnifiedAuth calls: https://mcp.notion.com/.well-known/oauth-authorization-server
 * Response tells UnifiedAuth where authorize and token endpoints are.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only support GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Determine base URL (for local dev vs production)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  // OAuth 2.0 Authorization Server Metadata
  const metadata = {
    // Issuer identifier (this server)
    issuer: baseUrl,

    // OAuth endpoints
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,

    // Supported response types
    response_types_supported: ['code'],

    // Supported grant types
    grant_types_supported: [
      'authorization_code',
      'refresh_token'
    ],

    // Token endpoint authentication methods
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic'
    ],

    // PKCE support
    code_challenge_methods_supported: [
      'S256',
      'plain'
    ],

    // Supported scopes
    scopes_supported: [
      'crm:read',
      'crm:write'
    ],

    // Additional metadata
    service_documentation: `${baseUrl}/docs/mcp-oauth`,
    
    // MCP-specific metadata (non-standard)
    mcp_server_url: `${baseUrl}/api/mcp/handler`,
    mcp_tools_count: 10,
    mcp_capabilities: ['contacts', 'deals'],
  };

  console.log('✅ OAuth metadata endpoint called', {
    from: req.headers['user-agent'],
    referer: req.headers.referer,
  });

  return res.status(200).json(metadata);
}
