/**
 * OAuth 2.0 Token Endpoint
 * 
 * This endpoint handles two grant types:
 * 1. authorization_code - Exchange authorization code for access tokens
 * 2. refresh_token - Refresh an expired access token
 * 
 * Flow:
 * 1. HubSpot calls this endpoint with the authorization code
 * 2. We validate the code and generate access/refresh tokens
 * 3. We store the mapping: our_token → hubspot_portal_id + hubspot_user_id
 * 4. When MCP is called with our_token, we look up which portal's credentials to use
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { OAUTH_CONFIG, type TokenRequest, type TokenResponse } from './types.js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🟢 ============================================');
  console.log('🟢 MCP OAUTH TOKEN EXCHANGE REQUEST');
  console.log('🟢 ============================================');
  
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  console.log('📋 Request Method:', req.method);
  console.log('📋 Request Headers:', JSON.stringify({
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'present' : 'none',
    'user-agent': req.headers['user-agent'],
  }, null, 2));

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS preflight - returning 200');
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.error('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📋 Request Body:', JSON.stringify(req.body, null, 2));
    
    const {
      grant_type,
      code,
      refresh_token,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
    } = req.body as TokenRequest;
    
    console.log('🔍 Parsed Token Request:');
    console.log('  - grant_type:', grant_type);
    console.log('  - code:', code ? code.substring(0, 10) + '...' : 'none');
    console.log('  - refresh_token:', refresh_token ? refresh_token.substring(0, 10) + '...' : 'none');
    console.log('  - redirect_uri:', redirect_uri);
    console.log('  - client_id:', client_id);
    console.log('  - client_secret:', client_secret ? 'present' : 'none');
    console.log('  - code_verifier:', code_verifier ? 'present' : 'none');

    // Validate client_id
    console.log('✓ Validating client_id...');
    console.log('  Expected:', OAUTH_CONFIG.CLIENT_ID);
    console.log('  Received:', client_id);
    if (!client_id || client_id !== OAUTH_CONFIG.CLIENT_ID) {
      console.error('❌ Invalid or missing client_id');
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Unknown or missing client_id'
      });
    }
    console.log('✅ client_id valid');

    // Validate client_secret if provided (confidential client)
    if (client_secret) {
      console.log('✓ Validating client_secret...');
      const secretMatches = client_secret === OAUTH_CONFIG.CLIENT_SECRET;
      console.log('  Secret matches:', secretMatches);
      if (!secretMatches) {
        console.error('❌ Invalid client_secret');
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client_secret'
        });
      }
      console.log('✅ client_secret valid');
    } else {
      console.log('ℹ️  No client_secret provided (public client)');
    }

    console.log('💾 Checking Supabase configuration...');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Server configuration error - missing Supabase credentials'
      });
    }
    console.log('✅ Supabase configuration present');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Handle authorization_code grant
    if (grant_type === 'authorization_code') {
      console.log('🔐 Processing authorization_code grant...');
      
      if (!code || !redirect_uri) {
        console.error('❌ Missing required parameters for authorization_code grant');
        console.error('  code:', code ? 'present' : 'MISSING');
        console.error('  redirect_uri:', redirect_uri ? 'present' : 'MISSING');
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code and redirect_uri are required for authorization_code grant'
        });
      }
      console.log('✅ Required parameters present');

      // Lookup authorization code in database
      console.log('💾 Looking up authorization code in database...');
      console.log('  Code:', code.substring(0, 10) + '...');
      
      const { data: authCodeData, error: codeError } = await supabase
        .from('mcp_oauth_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (codeError || !authCodeData) {
        console.error('❌ Authorization code not found in database');
        console.error('  Error:', codeError);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        });
      }
      console.log('✅ Authorization code found');
      console.log('  Code data:', JSON.stringify({
        ...authCodeData,
        code: authCodeData.code.substring(0, 10) + '...',
      }, null, 2));

      // Verify code hasn't expired
      console.log('✓ Checking code expiration...');
      const expiresAt = new Date(authCodeData.expires_at);
      const now = new Date();
      console.log('  Expires at:', expiresAt.toISOString());
      console.log('  Current time:', now.toISOString());
      console.log('  Is expired:', expiresAt < now);
      
      if (expiresAt < now) {
        console.error('❌ Authorization code expired');
        // Delete expired code
        await supabase.from('mcp_oauth_codes').delete().eq('code', code);
        console.log('🗑️  Deleted expired code from database');
        
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        });
      }
      console.log('✅ Code not expired');

      // Verify redirect_uri matches what was used in authorization request
      console.log('✓ Verifying redirect_uri match...');
      console.log('  Original:', authCodeData.redirect_uri);
      console.log('  Provided:', redirect_uri);
      if (authCodeData.redirect_uri !== redirect_uri) {
        console.error('❌ redirect_uri mismatch');
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'redirect_uri does not match authorization request'
        });
      }
      console.log('✅ redirect_uri matches');

      // Verify PKCE if code_challenge was provided
      if (authCodeData.code_challenge) {
        console.log('✓ Verifying PKCE...');
        console.log('  Challenge method:', authCodeData.code_challenge_method);
        console.log('  Challenge:', authCodeData.code_challenge.substring(0, 10) + '...');
        
        if (!code_verifier) {
          console.error('❌ code_verifier missing (PKCE required)');
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'code_verifier is required when PKCE was used'
          });
        }
        console.log('  Verifier present:', code_verifier.substring(0, 10) + '...');

        // Compute challenge from verifier
        const computedChallenge = authCodeData.code_challenge_method === 'S256'
          ? crypto.createHash('sha256').update(code_verifier).digest('base64url')
          : code_verifier; // plain method

        console.log('  Computed challenge:', computedChallenge.substring(0, 10) + '...');
        console.log('  Matches:', computedChallenge === authCodeData.code_challenge);

        // Verify it matches the original challenge
        if (computedChallenge !== authCodeData.code_challenge) {
          console.error('❌ PKCE validation failed - challenge mismatch');
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'PKCE validation failed'
          });
        }
        console.log('✅ PKCE validation passed');
      } else {
        console.log('ℹ️  No PKCE challenge (not required)');
      }

      // Generate new tokens
      console.log('🔐 Generating new tokens...');
      const accessToken = crypto.randomBytes(32).toString('base64url');
      const newRefreshToken = crypto.randomBytes(32).toString('base64url');
      const tokenExpiresAt = new Date(Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000);
      console.log('✅ Tokens generated');
      console.log('  Access token:', accessToken.substring(0, 10) + '...');
      console.log('  Refresh token:', newRefreshToken.substring(0, 10) + '...');
      console.log('  Expires at:', tokenExpiresAt.toISOString());

      // Store token registration WITH portal tracking
      console.log('💾 Storing token registration...');
      const registrationData = {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        client_id: authCodeData.client_id,
        scopes: authCodeData.scopes,
        hubspot_portal_id: authCodeData.hubspot_portal_id,
        last_used_at: new Date().toISOString(),
      };
      console.log('  Registration data:', JSON.stringify({
        ...registrationData,
        access_token: registrationData.access_token.substring(0, 10) + '...',
        refresh_token: registrationData.refresh_token.substring(0, 10) + '...',
      }, null, 2));
      
      const { error: insertError } = await supabase
        .from('mcp_user_registrations')
        .insert(registrationData);

      if (insertError) {
        console.error('❌ Failed to store user registration');
        console.error('  Error:', JSON.stringify(insertError, null, 2));
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to store token registration'
        });
      }
      console.log('✅ Token registration stored');

      // Delete used authorization code (single-use)
      console.log('🗑️  Deleting used authorization code...');
      await supabase.from('mcp_oauth_codes').delete().eq('code', code);
      console.log('✅ Authorization code deleted');

      console.log('🟢 ============================================');
      console.log('✅ OAUTH TOKEN EXCHANGE SUCCESSFUL');
      console.log('  Token expires in:', OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME, 'seconds');
      console.log('  Portal ID:', authCodeData.hubspot_portal_id || 'not provided');
      console.log('  Scopes:', authCodeData.scopes.join(', '));
      console.log('🟢 ============================================');

      // Return tokens to HubSpot
      const response: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
        refresh_token: newRefreshToken,
        scope: authCodeData.scopes.join(' '),
      };

      console.log('📤 Sending token response to HubSpot');
      return res.status(200).json(response);
    }
    
    // Handle refresh_token grant
    else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'refresh_token is required for refresh_token grant'
        });
      }

      // Lookup registration by refresh_token
      const { data: registration, error: refreshError } = await supabase
        .from('mcp_user_registrations')
        .select('*')
        .eq('refresh_token', refresh_token)
        .single();

      if (refreshError || !registration) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired refresh token'
        });
      }

      // Generate new access token (keep same refresh token)
      const newAccessToken = crypto.randomBytes(32).toString('base64url');
      const tokenExpiresAt = new Date(Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000);

      // Update registration with new access token
      const { error: updateError } = await supabase
        .from('mcp_user_registrations')
        .update({
          access_token: newAccessToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .eq('id', registration.id);

      if (updateError) {
        console.error('Failed to update access token:', updateError);
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to refresh access token'
        });
      }

      console.log('✅ OAuth token refresh successful:', {
        portal_id: registration.hubspot_portal_id,
        user_id: registration.hubspot_user_id
      });

      // Return new access token
      const response: TokenResponse = {
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
        scope: registration.scopes.join(' '),
      };

      return res.status(200).json(response);
    }
    
    // Unsupported grant type
    else {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported. Use 'authorization_code' or 'refresh_token'.`
      });
    }

  } catch (error) {
    console.error('🟢 ============================================');
    console.error('❌ OAUTH TOKEN ERROR');
    console.error('🟢 ============================================');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('🟢 ============================================');
    
    return res.status(500).json({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
