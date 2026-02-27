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
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      grant_type,
      code,
      refresh_token,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
    } = req.body as TokenRequest;

    if (!client_id || client_id !== OAUTH_CONFIG.CLIENT_ID) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Unknown or missing client_id'
      });
    }

    if (client_secret && client_secret !== OAUTH_CONFIG.CLIENT_SECRET) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client_secret'
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Server configuration error - missing Supabase credentials'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Handle authorization_code grant
    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code and redirect_uri are required for authorization_code grant'
        });
      }

      const { data: authCodeData, error: codeError } = await supabase
        .from('mcp_oauth_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (codeError || !authCodeData) {
        console.error('Authorization code not found:', codeError);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        });
      }

      if (new Date(authCodeData.expires_at) < new Date()) {
        await supabase.from('mcp_oauth_codes').delete().eq('code', code);
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        });
      }

      if (authCodeData.redirect_uri !== redirect_uri) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'redirect_uri does not match authorization request'
        });
      }

      // Verify PKCE if code_challenge was provided
      if (authCodeData.code_challenge) {
        if (!code_verifier) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'code_verifier is required when PKCE was used'
          });
        }

        const computedChallenge = authCodeData.code_challenge_method === 'S256'
          ? crypto.createHash('sha256').update(code_verifier).digest('base64url')
          : code_verifier;

        if (computedChallenge !== authCodeData.code_challenge) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'PKCE validation failed'
          });
        }
      }

      const accessToken = crypto.randomBytes(32).toString('base64url');
      const newRefreshToken = crypto.randomBytes(32).toString('base64url');
      const tokenExpiresAt = new Date(Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000);

      const { error: insertError } = await supabase
        .from('mcp_user_registrations')
        .insert({
          access_token: accessToken,
          refresh_token: newRefreshToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          client_id: authCodeData.client_id,
          scopes: authCodeData.scopes,
          hubspot_portal_id: authCodeData.hubspot_portal_id,
          last_used_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to store user registration:', insertError);
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to store token registration'
        });
      }

      // Delete used authorization code (single-use)
      await supabase.from('mcp_oauth_codes').delete().eq('code', code);

      const response: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
        refresh_token: newRefreshToken,
        scope: authCodeData.scopes.join(' '),
      };

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

      const newAccessToken = crypto.randomBytes(32).toString('base64url');
      const tokenExpiresAt = new Date(Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000);

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
    console.error('OAuth token error:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
