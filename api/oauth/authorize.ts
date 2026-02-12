/**
 * OAuth 2.0 Authorization Endpoint
 * 
 * This is where HubSpot Unified Auth redirects users when they connect
 * your MCP server in Breeze Studio.
 * 
 * Flow:
 * 1. User clicks "Connect" in Breeze Studio
 * 2. HubSpot redirects to this endpoint with OAuth parameters
 * 3. We generate an authorization code
 * 4. We redirect back to HubSpot with the code
 * 5. HubSpot exchanges code for tokens at /api/oauth/token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { OAUTH_CONFIG, type AuthorizationRequest, validateScopes, parseScopes } from './types';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse OAuth authorization request parameters
    const {
      response_type,
      client_id,
      redirect_uri,
      scope = 'crm:read crm:write',
      state,
      code_challenge,
      code_challenge_method,
    } = req.query as Partial<AuthorizationRequest>;

    // Validate response_type
    if (!response_type || response_type !== 'code') {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'response_type must be "code"'
      });
    }

    // Validate client_id
    if (!client_id || client_id !== OAUTH_CONFIG.CLIENT_ID) {
      return res.status(400).json({
        error: 'invalid_client',
        error_description: `Unknown client_id: ${client_id}`
      });
    }

    // Validate redirect_uri is present
    if (!redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
    }

    // TODO: Validate redirect_uri against whitelist
    // For now, we'll allow any HubSpot domain
    const redirectUrl = typeof redirect_uri === 'string' ? redirect_uri : redirect_uri[0];
    const allowedDomains = [
      'hubspot.com',
      'hubspotqa.com',
      'localhost' // For testing
    ];
    
    const isAllowedRedirect = allowedDomains.some(domain => 
      redirectUrl.includes(domain)
    );

    if (!isAllowedRedirect) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri not whitelisted'
      });
    }

    // Validate scopes
    if (!validateScopes(scope as string)) {
      return res.status(400).json({
        error: 'invalid_scope',
        error_description: 'One or more requested scopes are invalid'
      });
    }

    // Generate secure authorization code
    const authCode = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + OAUTH_CONFIG.AUTH_CODE_LIFETIME * 1000);

    // Store authorization code in database
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Server configuration error - missing Supabase credentials'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: insertError } = await supabase
      .from('mcp_oauth_codes')
      .insert({
        code: authCode,
        client_id: typeof client_id === 'string' ? client_id : client_id[0],
        redirect_uri: redirectUrl,
        scopes: parseScopes(scope as string),
        state: state ? (typeof state === 'string' ? state : state[0]) : null,
        code_challenge: code_challenge ? (typeof code_challenge === 'string' ? code_challenge : code_challenge[0]) : null,
        code_challenge_method: code_challenge_method ? (typeof code_challenge_method === 'string' ? code_challenge_method : code_challenge_method[0]) : null,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to store authorization code:', insertError);
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to store authorization code'
      });
    }

    // Redirect back to HubSpot with authorization code
    const callbackUrl = new URL(redirectUrl);
    callbackUrl.searchParams.set('code', authCode);
    
    if (state) {
      const stateValue = typeof state === 'string' ? state : state[0];
      callbackUrl.searchParams.set('state', stateValue);
    }

    console.log('✅ OAuth authorization successful:', {
      code_length: authCode.length,
      expires_in: OAUTH_CONFIG.AUTH_CODE_LIFETIME
    });

    // Redirect to HubSpot callback
    return res.redirect(302, callbackUrl.toString());

  } catch (error) {
    console.error('OAuth authorize error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
