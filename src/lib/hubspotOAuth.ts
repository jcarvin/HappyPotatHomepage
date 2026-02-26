import { updateApiToken, updateApiTokenForUser } from './auth';
import type { AppName } from './appConfig';

export interface TokenExchangeOptions {
  code: string;
  appName: AppName; // Which app these tokens are for
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userId?: string; // Optional: if provided, saves to specific user without requiring auth session
  codeVerifier?: string; // Optional: PKCE code verifier
}

export interface TokenExchangeResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  portalId?: string;
  error?: string;
}

export interface AccountInfo {
  portalId: string;
  hubId?: number;
  timeZone?: string;
  accountType?: string;
  hubDomain?: string;
}

/**
 * Exchange OAuth authorization code for access and refresh tokens
 */
export async function exchangeCodeForToken(options: TokenExchangeOptions): Promise<TokenExchangeResult> {
  const { code, appName, clientId, clientSecret, redirectUri, userId, codeVerifier } = options;

  console.log(`🔄 Exchanging OAuth code for tokens (app: ${appName})...`);

  try {
    // Exchange code for tokens via proxy
    const proxyUrl = new URL('https://us-central1-hubspot-oauth-proxy.cloudfunctions.net/exchange_code');
    if (codeVerifier) {
      proxyUrl.searchParams.set('code_verifier', codeVerifier);
    }

    const response = await fetch(proxyUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token exchange failed:', response.status, errorText);
      return {
        success: false,
        error: `Token exchange failed: ${response.status} ${errorText}`
      };
    }

    const data = await response.json();

    if (!data.access_token) {
      console.error('❌ No access token in response');
      return {
        success: false,
        error: 'No access token received from HubSpot'
      };
    }

    console.log('✅ token exchange completed:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in
    });

    // Store tokens in localStorage as backup
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    // Save tokens to database
    console.log('💾 Saving HubSpot tokens to database...');

    let saveSuccess = false;
    let saveError: string | null = null;

    if (userId) {
      // Save for specific user (OAuth callback without auth session)
      console.log(`🔑 Saving ${appName} tokens for user:`, userId);
      const result = await updateApiTokenForUser(
        userId,
        appName,
        data.access_token,
        data.refresh_token,
        data.expires_in
      );
      saveSuccess = result.success;
      saveError = result.error;
    } else {
      // Save for current authenticated user
      console.log(`🔑 Saving ${appName} tokens for authenticated user`);
      const result = await updateApiToken(
        appName,
        data.access_token,
        data.refresh_token,
        data.expires_in
      );
      saveSuccess = result.success;
      saveError = result.error;
    }

    if (saveError) {
      console.error('❌ Failed to save tokens to database:', saveError);
      return {
        success: false,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        error: `Token received but failed to save: ${saveError}`
      };
    }

    if (!saveSuccess) {
      console.error('❌ Token save returned false');
      return {
        success: false,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        error: 'Failed to save tokens to database'
      };
    }

    console.log('✅ Tokens saved successfully to database');

    // Fetch account info to get portal ID
    const accountInfo = await fetchAccountInfo(data.access_token);

    if (!accountInfo.portalId) {
      console.warn('⚠️ Could not fetch portal ID');
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        error: 'Tokens saved but could not fetch portal ID'
      };
    }

    console.log('✅ OAuth flow complete! Portal ID:', accountInfo.portalId);

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      portalId: accountInfo.portalId
    };
  } catch (error) {
    console.error('❌ Error during token exchange:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during token exchange'
    };
  }
}

/**
 * Fetch HubSpot account information using an access token
 */
export async function fetchAccountInfo(accessToken: string): Promise<AccountInfo> {
  try {
    console.log('🔍 Fetching account info from HubSpot...');

    const response = await fetch('https://api.hubspotqa.com/account-info/v3/api-usage/daily', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch account info:', response.status);
      return { portalId: '' };
    }

    const data = await response.json();

    console.log('✅ Account info fetched:', {
      portalId: data.portalId,
      hubId: data.hubId
    });

    return {
      portalId: String(data.portalId),
      hubId: data.hubId,
      timeZone: data.timeZone,
      accountType: data.accountType,
      hubDomain: data.hubDomain
    };
  } catch (error) {
    console.error('❌ Error fetching account info:', error);
    return { portalId: '' };
  }
}
