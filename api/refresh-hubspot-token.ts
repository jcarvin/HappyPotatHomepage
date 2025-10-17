import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.VITE_HUBSPOT_CLIENT_ID || process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.VITE_HUBSPOT_CLIENT_SECRET || process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_HUBSPOT_REDIRECT_URI || process.env.HUBSPOT_REDIRECT_URI;

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

  const { refresh_token, client_id, client_secret, redirect_uri } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  // Use values from request body if provided, otherwise fall back to environment variables
  const clientId = client_id || CLIENT_ID;
  const clientSecret = client_secret || CLIENT_SECRET;
  const redirectUri = redirect_uri || REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      envVars: Object.keys(process.env).filter(key => key.includes('HUBSPOT'))
    });
    return res.status(500).json({
      error: 'Server configuration error - missing HubSpot credentials',
      details: {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      }
    });
  }

  try {
    // Exchange refresh token for new access token
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        refresh_token: refresh_token
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('HubSpot token refresh failed:', errorData);
      return res.status(response.status).json({
        error: 'Failed to refresh token',
        details: errorData
      });
    }

    const tokenData = await response.json();

    // Return the new tokens
    return res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error('Error refreshing HubSpot token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

