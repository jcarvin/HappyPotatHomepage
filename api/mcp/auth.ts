/**
 * MCP Authentication Middleware (SIMPLIFIED for Marketplace App)
 * 
 * Validates incoming MCP requests from HubSpot Breeze agents.
 * 
 * Simplified Flow (Marketplace App):
 * 1. Extract Bearer token from Authorization header
 * 2. Validate token exists and hasn't expired
 * 3. Get HubSpot API credentials from app installation
 * 4. Return context with HubSpot access token
 * 
 * Note: Portal context comes from app installation, not OAuth flow.
 * HubSpot UnifiedAuth handles portal-to-token mapping internally.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

/**
 * Authentication context for MCP requests
 * Contains HubSpot access token for calling CRM APIs
 */
export interface MCPAuthContext {
  hubspotAccessToken: string;
  mcpScopes: string[];
  portalId?: string; // Optional: if we can extract from app installation
}

/**
 * Result of MCP request validation
 */
export type MCPAuthResult = 
  | { success: true; context: MCPAuthContext }
  | { success: false; error: string };

/**
 * Validate MCP request and retrieve HubSpot credentials
 * 
 * Simplified approach for marketplace app:
 * - OAuth token validation only
 * - Portal context from existing app installation
 * - Assumes single app installation or portal provided in headers
 */
export async function validateMCPRequest(
  authorizationHeader: string | undefined,
  portalIdHeader?: string // Optional: X-HubSpot-Portal-Id header
): Promise<MCPAuthResult> {
  
  // Check for Authorization header
  if (!authorizationHeader) {
    return {
      success: false,
      error: 'Missing Authorization header'
    };
  }

  // Verify Bearer token format
  if (!authorizationHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>'
    };
  }

  // Extract MCP access token
  const mcpAccessToken = authorizationHeader.substring(7).trim();

  if (!mcpAccessToken) {
    return {
      success: false,
      error: 'Empty access token'
    };
  }

  // Check Supabase configuration
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration');
    return {
      success: false,
      error: 'Server configuration error'
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Validate MCP token exists and hasn't expired
  const { data: registration, error: regError } = await supabase
    .from('mcp_user_registrations')
    .select('*')
    .eq('access_token', mcpAccessToken)
    .single();

  if (regError || !registration) {
    console.error('MCP token not found:', regError);
    return {
      success: false,
      error: 'Invalid or expired MCP access token'
    };
  }

  // Check if MCP token has expired
  if (new Date(registration.token_expires_at) < new Date()) {
    return {
      success: false,
      error: 'MCP access token expired. Use refresh_token to obtain a new one.'
    };
  }

  // Update last_used_at timestamp
  await supabase
    .from('mcp_user_registrations')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', registration.id)
    .then(result => {
      if (result.error) {
        console.warn('Failed to update last_used_at:', result.error);
      }
    });

  // Get HubSpot API credentials from app installation
  // Approach: Use the most recent app installation, or filter by portalId if provided
  let query = supabase
    .from('app_tokens')
    .select('access_token, refresh_token, access_token_expires_at, user_id')
    .eq('app_name', 'loadedpotat');

  // If portal ID provided in header, filter by it
  if (portalIdHeader) {
    query = query.eq('user_id', portalIdHeader);
  }

  const { data: appToken, error: tokenError } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (tokenError || !appToken) {
    console.error('HubSpot app tokens not found:', tokenError);
    return {
      success: false,
      error: 'No HubSpot credentials found. The Loaded Potat app must be installed first.'
    };
  }

  if (!appToken.access_token) {
    return {
      success: false,
      error: 'HubSpot access token missing. Please reinstall the Loaded Potat app.'
    };
  }

  // Check if HubSpot token needs refresh
  let hubspotAccessToken = appToken.access_token;
  
  if (appToken.access_token_expires_at && appToken.refresh_token) {
    const expiresAt = new Date(appToken.access_token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    // Refresh if expired or expiring soon
    if (expiresAt <= fiveMinutesFromNow) {
      console.log('🔄 HubSpot token expiring soon, refreshing...');
      
      try {
        const apiBaseUrl = process.env.API_BASE_URL || 'https://happy-potat-homepage.vercel.app';
        const refreshResponse = await fetch(`${apiBaseUrl}/api/refresh-hubspot-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: appToken.refresh_token,
            app_name: 'loadedpotat',
          }),
        });

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          hubspotAccessToken = newTokens.access_token;

          // Update in database
          await supabase
            .from('app_tokens')
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              access_token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            })
            .eq('app_name', 'loadedpotat')
            .eq('user_id', appToken.user_id);

          console.log('✅ HubSpot token refreshed successfully');
        } else {
          const errorData = await refreshResponse.json().catch(() => ({}));
          console.error('❌ Failed to refresh HubSpot token:', errorData);
        }
      } catch (refreshError) {
        console.error('❌ Error during HubSpot token refresh:', refreshError);
      }
    }
  }

  // Return authentication context
  return {
    success: true,
    context: {
      hubspotAccessToken,
      mcpScopes: registration.scopes,
      portalId: appToken.user_id, // Portal ID from app installation
    },
  };
}

/**
 * Helper to check if context has required scope
 */
export function hasScope(context: MCPAuthContext, requiredScope: string): boolean {
  return context.mcpScopes.includes(requiredScope);
}
