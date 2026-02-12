/**
 * OAuth 2.0 Provider Types and Configuration
 * Used for MCP server authentication where HubSpot users connect via OAuth
 */

export const OAUTH_CONFIG = {
  // Client credentials
  CLIENT_ID: process.env.VITE_LOADEDPOTAT_MCP_CLIENT_ID || 'loadedpotat-mcp',
  CLIENT_SECRET: process.env.LOADEDPOTAT_MCP_CLIENT_SECRET,
  
  // Token lifetimes (in seconds)
  ACCESS_TOKEN_LIFETIME: 3600, // 1 hour
  REFRESH_TOKEN_LIFETIME: 2592000, // 30 days
  AUTH_CODE_LIFETIME: 300, // 5 minutes
  
  // Scopes
  AVAILABLE_SCOPES: ['crm:read', 'crm:write'] as const,
  DEFAULT_SCOPES: ['crm:read', 'crm:write'] as const,
};

/**
 * OAuth Authorization Request
 * Received from HubSpot when user initiates MCP connection
 */
export interface AuthorizationRequest {
  response_type: 'code';
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
  
  // PKCE parameters (optional but recommended for security)
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
  
  // HubSpot portal context (may be provided in various ways)
  portal_id?: string;
  hubspot_portal_id?: string;
}

/**
 * OAuth Token Request
 * Received from HubSpot to exchange authorization code for tokens
 * or to refresh an access token
 */
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  
  // For authorization_code grant
  code?: string;
  redirect_uri?: string;
  code_verifier?: string; // PKCE verification
  
  // For refresh_token grant
  refresh_token?: string;
  
  // Client authentication
  client_id: string;
  client_secret?: string;
}

/**
 * OAuth Token Response
 * Returned to HubSpot after successful token exchange
 */
export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * OAuth Error Response
 * Standard OAuth 2.0 error format
 */
export interface OAuthErrorResponse {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'server_error';
  error_description?: string;
  error_uri?: string;
}

/**
 * Authorization Code Data
 * Stored temporarily in database during OAuth flow
 */
export interface AuthCodeData {
  code: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  hubspot_portal_id?: string;
  created_at: string;
  expires_at: string;
}

/**
 * MCP User Registration
 * Stored in database to track OAuth tokens
 * Now includes portal ID to link token to specific HubSpot portal
 */
export interface MCPUserRegistration {
  id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at: string;
  client_id: string;
  scopes: string[];
  hubspot_portal_id?: string;
  created_at: string;
  last_used_at?: string;
}

/**
 * Validate OAuth scope string
 */
export function validateScopes(scopeString: string): boolean {
  const requestedScopes = scopeString.split(' ');
  const availableScopes = OAUTH_CONFIG.AVAILABLE_SCOPES as readonly string[];
  
  return requestedScopes.every(scope => availableScopes.includes(scope));
}

/**
 * Parse scope string to array
 */
export function parseScopes(scopeString: string): string[] {
  return scopeString.split(' ').filter(s => s.length > 0);
}

/**
 * Format scopes array to string
 */
export function formatScopes(scopes: string[]): string {
  return scopes.join(' ');
}
