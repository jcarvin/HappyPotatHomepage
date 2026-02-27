/**
 * OAuth 2.0 Authorization Server Metadata
 * 
 * RFC 8414: OAuth 2.0 Authorization Server Metadata
 * https://datatracker.ietf.org/doc/html/rfc8414
 * 
 * This endpoint is fetched by HubSpot's UnifiedAuth to discover
 * the OAuth endpoints for this MCP server.
 * 
 * Served at /.well-known/oauth-authorization-server via a Vercel rewrite
 * (Vercel ignores dot-prefixed directories like api/.well-known/)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  // Only support GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // Determine base URL (for local dev vs production)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  // OAuth 2.0 Authorization Server Metadata
  const metadata = {
    issuer: baseUrl,

    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,

    response_types_supported: ['code'],

    grant_types_supported: [
      'authorization_code',
      'refresh_token'
    ],

    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic'
    ],

    code_challenge_methods_supported: [
      'S256',
      'plain'
    ],

    scopes_supported: [
      'crm:read',
      'crm:write'
    ],

    service_documentation: `${baseUrl}/docs/mcp-oauth`,

    mcp_server_url: `${baseUrl}/api/mcp/handler`,
    mcp_tools_count: 10,
    mcp_capabilities: ['contacts', 'deals'],
  };

  return res.status(200).json(metadata);
}
