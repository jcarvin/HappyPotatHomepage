import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { endpoint, method = 'GET', body } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    // Get user ID from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const userToken = authHeader.substring(7);

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the user's Supabase token and get their user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    // Get the user's HubSpot access token from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('api_token, refresh_token, access_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!profile.api_token) {
      return res.status(404).json({ error: 'No HubSpot access token found. Please authenticate with HubSpot.' });
    }

    let accessToken = profile.api_token;

    // Check if token is expired or expiring soon (within 5 minutes)
    const now = Date.now();
    const fiveMinutesFromNow = new Date(now + 5 * 60 * 1000);

    console.log('🔍 Token expiry check:', {
      hasExpiryDate: !!profile.access_token_expires_at,
      hasRefreshToken: !!profile.refresh_token,
      expiresAt: profile.access_token_expires_at,
      now: new Date(now).toISOString(),
      fiveMinutesFromNow: fiveMinutesFromNow.toISOString()
    });

    if (profile.access_token_expires_at) {
      const expiresAt = new Date(profile.access_token_expires_at);

      if (expiresAt <= fiveMinutesFromNow) {
        console.log('⚠️ Token is expired or expiring soon!');

        if (!profile.refresh_token) {
          console.error('❌ No refresh token available. User needs to re-authenticate.');
          return res.status(401).json({
            error: 'Access token expired and no refresh token available. Please re-authenticate with HubSpot.',
            needsReauth: true
          });
        }

        // Token is expired or expiring soon, refresh it
        console.log('🔄 Attempting to refresh access token...');

        try {
          const refreshResponse = await fetch(`${req.headers.origin || 'https://happy-potat-homepage.vercel.app'}/api/refresh-hubspot-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: profile.refresh_token })
          });

          if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json().catch(() => ({}));
            console.error('❌ Token refresh failed:', errorData);
            return res.status(401).json({
              error: 'Failed to refresh access token. Please re-authenticate with HubSpot.',
              details: errorData,
              needsReauth: true
            });
          }

          const newTokens = await refreshResponse.json();
          accessToken = newTokens.access_token;

          // Update the database with new tokens
          const newExpiresAt = new Date(now + newTokens.expires_in * 1000).toISOString();
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              api_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              access_token_expires_at: newExpiresAt
            })
            .eq('id', user.id);

          if (updateError) {
            console.error('⚠️ Failed to update tokens in database:', updateError);
            // Continue anyway with the new token
          }

          console.log('✅ Access token refreshed successfully! New expiry:', newExpiresAt);
        } catch (refreshError) {
          console.error('❌ Error during token refresh:', refreshError);
          return res.status(500).json({
            error: 'Error refreshing token',
            message: refreshError instanceof Error ? refreshError.message : 'Unknown error'
          });
        }
      } else {
        console.log('✅ Access token is still valid');
      }
    } else {
      console.log('⚠️ No expiry date stored - cannot determine if token needs refresh');
    }

    // Make the request to HubSpot API
    const hubspotUrl = `https://api.hubapi.com${endpoint}`;
    const hubspotResponse = await fetch(hubspotUrl, {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await hubspotResponse.json().catch(() => ({}));

    // Return the response with the same status code
    return res.status(hubspotResponse.status).json(responseData);

  } catch (error) {
    console.error('Error in HubSpot proxy:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

