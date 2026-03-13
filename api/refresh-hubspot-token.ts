import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers to allow requests from HubSpot iframes
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    grant_type = 'refresh_token',
    // authorization_code params
    code,
    redirect_uri,
    code_verifier,
    // refresh_token params
    refresh_token,
    app_name = 'potat',
    // explicit credentials (used by authorization_code callers; optional for refresh_token)
    client_id,
    client_secret,
  } = req.body;

  // ── authorization_code grant ──────────────────────────────────────────────
  if (grant_type === 'authorization_code') {
    if (!code || !redirect_uri || !client_id || !client_secret) {
      return res.status(400).json({
        error: 'code, redirect_uri, client_id, and client_secret are required for authorization_code grant'
      });
    }

    try {
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id,
        client_secret,
        redirect_uri,
      };
      if (code_verifier) {
        params.code_verifier = code_verifier;
      }

      const response = await fetch('https://api.hubapiqa.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('HubSpot authorization_code exchange failed:', errorData);
        return res.status(response.status).json({
          error: 'Token exchange failed',
          details: errorData,
        });
      }

      const tokenData = await response.json();
      return res.status(200).json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
      });
    } catch (error) {
      console.error('Error during authorization_code exchange:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ── refresh_token grant (existing behavior) ───────────────────────────────
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  // Validate app_name
  const validApps = ['potat', 'instapotat', 'loadedpotat', 'potataugratin'];
  if (!validApps.includes(app_name)) {
    return res.status(400).json({ error: 'Invalid app_name. Must be one of: potat, instapotat, loadedpotat, potataugratin' });
  }

  // Get client credentials based on app_name
  // First check if explicitly provided in request, then check app-specific env vars, then fall back to main env vars
  let clientId = client_id;
  let clientSecret = client_secret;

  if (!clientId || !clientSecret) {
    // Try app-specific environment variables
    const appNameUpper = app_name.toUpperCase();
    if (appNameUpper === 'POTAT') {
      clientId = clientId || process.env.VITE_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
      clientSecret = clientSecret || process.env.VITE_HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_CLIENT_SECRET;
    } else if (appNameUpper === 'INSTAPOTAT') {
      clientId = clientId || process.env.VITE_INSTAPOTAT_CLIENT_ID || process.env.VITE_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
      clientSecret = clientSecret || process.env.VITE_INSTAPOTAT_CLIENT_SECRET || process.env.VITE_HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_CLIENT_SECRET;
    } else if (appNameUpper === 'LOADEDPOTAT') {
      clientId = clientId || process.env.VITE_LOADEDPOTAT_CLIENT_ID;
      clientSecret = clientSecret || process.env.VITE_LOADEDPOTAT_CLIENT_SECRET;
    } else if (appNameUpper === 'POTATAUGRATIN') {
      clientId = clientId || process.env.VITE_AU_GRATIN_CLIENT_ID;
      clientSecret = clientSecret || process.env.VITE_AU_GRATIN_CLIENT_SECRET;
    }
  }

  if (!clientId || !clientSecret) {
    console.error(`Missing credentials for ${app_name}:`, {
      appName: app_name,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      envVars: Object.keys(process.env).filter(key => key.includes('HUBSPOT') || key.includes('GRATIN') || key.includes('POTAT'))
    });
    return res.status(500).json({
      error: `Server configuration error - missing HubSpot credentials for ${app_name}`,
      appName: app_name,
      details: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      }
    });
  }

  try {
    // Exchange refresh token for new access token
    const response = await fetch('https://api.hubapiqa.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refresh_token
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`HubSpot token refresh failed for ${app_name}:`, errorData);
      return res.status(response.status).json({
        error: `Failed to refresh ${app_name} token`,
        appName: app_name,
        details: errorData
      });
    }

    const tokenData = await response.json();

    // Return the new tokens
    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      app_name: app_name
    });
  } catch (error) {
    console.error(`Error refreshing ${app_name} HubSpot token:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      appName: app_name,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

