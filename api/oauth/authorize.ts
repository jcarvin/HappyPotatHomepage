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
import { OAUTH_CONFIG, type AuthorizationRequest, validateScopes, parseScopes } from './types.js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🔵 ============================================');
  console.log('🔵 MCP OAUTH AUTHORIZE REQUEST RECEIVED');
  console.log('🔵 ============================================');

  // Log request method
  console.log('📋 Request Method:', req.method);
  console.log('📋 Request URL:', req.url);
  console.log('📋 Request Headers:', JSON.stringify({
    host: req.headers.host,
    'user-agent': req.headers['user-agent'],
    referer: req.headers.referer,
    origin: req.headers.origin,
  }, null, 2));

  // Only accept GET requests
  if (req.method !== 'GET') {
    console.error('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log all query parameters
    console.log('📋 All Query Parameters:', JSON.stringify(req.query, null, 2));

    // Parse OAuth authorization request parameters
    const {
      response_type,
      client_id,
      redirect_uri,
      scope = 'crm:read crm:write',
      state,
      code_challenge,
      code_challenge_method,
      portal_id,
      hubspot_portal_id,
    } = req.query as Partial<AuthorizationRequest>;

    // Extract portal ID from various possible sources
    const portalId = portal_id || hubspot_portal_id;

    console.log('🔍 Parsed OAuth Parameters:');
    console.log('  - response_type:', response_type);
    console.log('  - client_id:', client_id);
    console.log('  - redirect_uri:', redirect_uri);
    console.log('  - scope:', scope);
    console.log('  - state:', state ? `${String(state).substring(0, 20)}...` : 'none');
    console.log('  - code_challenge:', code_challenge ? 'present' : 'none');
    console.log('  - code_challenge_method:', code_challenge_method || 'none');
    console.log('  - portal_id:', portalId || 'NOT PROVIDED');
    console.log('  - OAUTH_CONFIG.CLIENT_ID:', OAUTH_CONFIG.CLIENT_ID);

    // Validate response_type
    console.log('✓ Validating response_type...');
    if (!response_type || response_type !== 'code') {
      console.error('❌ Invalid response_type:', response_type);
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'response_type must be "code"'
      });
    }
    console.log('✅ response_type valid: code');

    // Validate client_id
    console.log('✓ Validating client_id...');
    if (!client_id || client_id !== OAUTH_CONFIG.CLIENT_ID) {
      console.error('❌ Invalid client_id:', client_id, 'Expected:', OAUTH_CONFIG.CLIENT_ID);
      return res.status(400).json({
        error: 'invalid_client',
        error_description: `Unknown client_id: ${client_id}`
      });
    }
    console.log('✅ client_id valid:', client_id);

    // Validate redirect_uri is present
    console.log('✓ Validating redirect_uri...');
    if (!redirect_uri) {
      console.error('❌ redirect_uri missing');
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
    }
    console.log('✅ redirect_uri present:', redirect_uri);

    // Validate redirect_uri against whitelist
    console.log('✓ Validating redirect_uri against whitelist...');
    const redirectUrl = typeof redirect_uri === 'string' ? redirect_uri : redirect_uri[0];
    const allowedDomains = [
      'hubspot.com',
      'hubspotqa.com',
      'localhost' // For testing
    ];

    console.log('  Redirect URL:', redirectUrl);
    console.log('  Allowed domains:', allowedDomains);

    const isAllowedRedirect = allowedDomains.some(domain =>
      redirectUrl.includes(domain)
    );

    if (!isAllowedRedirect) {
      console.error('❌ redirect_uri not whitelisted:', redirectUrl);
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri not whitelisted'
      });
    }
    console.log('✅ redirect_uri whitelisted');

    // Validate scopes
    console.log('✓ Validating scopes...');
    const scopeString = scope as string;
    console.log('  Requested scopes:', scopeString);

    if (!validateScopes(scopeString)) {
      console.error('❌ Invalid scopes:', scopeString);
      return res.status(400).json({
        error: 'invalid_scope',
        error_description: 'One or more requested scopes are invalid'
      });
    }
    console.log('✅ Scopes valid:', parseScopes(scopeString));

    // Generate secure authorization code
    console.log('🔐 Generating authorization code...');
    const authCode = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + OAUTH_CONFIG.AUTH_CODE_LIFETIME * 1000);
    console.log('✅ Auth code generated:', authCode.substring(0, 10) + '...');
    console.log('  Expires at:', expiresAt.toISOString());
    console.log('  Expires in:', OAUTH_CONFIG.AUTH_CODE_LIFETIME, 'seconds');

    // Store authorization code in database
    console.log('💾 Checking Supabase configuration...');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase credentials');
      console.error('  SUPABASE_URL:', SUPABASE_URL ? 'present' : 'MISSING');
      console.error('  SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'present' : 'MISSING');
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Server configuration error - missing Supabase credentials'
      });
    }
    console.log('✅ Supabase credentials present');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('✅ Supabase client created');

    console.log('💾 Inserting auth code into database...');
    const insertData = {
      code: authCode,
      client_id: typeof client_id === 'string' ? client_id : client_id[0],
      redirect_uri: redirectUrl,
      scopes: parseScopes(scope as string),
      state: state ? (typeof state === 'string' ? state : state[0]) : null,
      code_challenge: code_challenge ? (typeof code_challenge === 'string' ? code_challenge : code_challenge[0]) : null,
      code_challenge_method: code_challenge_method ? (typeof code_challenge_method === 'string' ? code_challenge_method : code_challenge_method[0]) : null,
      hubspot_portal_id: portalId ? (typeof portalId === 'string' ? portalId : portalId[0]) : null,
      expires_at: expiresAt.toISOString(),
    };
    console.log('  Insert data:', JSON.stringify({
      ...insertData,
      code: insertData.code.substring(0, 10) + '...',
    }, null, 2));

    const { error: insertError } = await supabase
      .from('mcp_oauth_codes')
      .insert(insertData);

    if (insertError) {
      console.error('❌ Failed to store authorization code:', insertError);
      console.error('  Error details:', JSON.stringify(insertError, null, 2));
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to store authorization code'
      });
    }
    console.log('✅ Auth code stored in database');

    // Redirect back to HubSpot with authorization code
    console.log('🔄 Building redirect URL...');
    const callbackUrl = new URL(redirectUrl);
    console.log('  Base redirect_uri:', redirectUrl);

    callbackUrl.searchParams.set('code', authCode);
    console.log('  Added code parameter:', authCode.substring(0, 10) + '...');

    if (state) {
      const stateValue = typeof state === 'string' ? state : state[0];
      callbackUrl.searchParams.set('state', stateValue);
      console.log('  Added state parameter:', typeof stateValue === 'string' ? stateValue.substring(0, 20) + '...' : stateValue);
    }

    const finalRedirectUrl = callbackUrl.toString();
    console.log('  Final redirect URL:', finalRedirectUrl);

    console.log('✅ OAuth authorization successful:', {
      code_length: authCode.length,
      expires_in: OAUTH_CONFIG.AUTH_CODE_LIFETIME,
      portal_id: portalId || 'not provided'
    });

    console.log('🚀 Redirecting to HubSpot callback (302)...');
    console.log('🔵 ============================================');

    // Redirect to HubSpot callback
    return res.redirect(302, finalRedirectUrl);

  } catch (error) {
    console.error('🔵 ============================================');
    console.error('❌ OAUTH AUTHORIZE ERROR');
    console.error('🔵 ============================================');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('🔵 ============================================');

    return res.status(500).json({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
