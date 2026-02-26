import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import type { AppName } from './appConfig';

export interface UserCredentials {
  email: string;
  password: string;
  username: string;
}

export interface OAuthState {
  stateToken: string;
  userId: string;
  expiresAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  apiToken: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: string | null;
}

/**
 * Register a new user with email, username, and password
 * Uses Supabase Auth for secure password hashing and authentication
 * Note: API token will be generated/added separately after registration
 */
export async function registerUser(credentials: UserCredentials): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { email, password, username } = credentials;

    // Register with Supabase Auth (handles secure password hashing)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (authError) {
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Failed to create user' };
    }

    // Create user profile (API token will be added later)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        username,
        api_token: null
      });

    if (profileError) {
      // If profile creation fails, we should ideally clean up the auth user
      // but for now just return the error
      return { user: null, error: `Profile creation failed: ${profileError.message}` };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        username,
        apiToken: null
      },
      error: null
    };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Registration failed' };
  }
}

/**
 * Login user with email and password
 * Uses Supabase Auth for secure authentication
 */
export async function loginUser(email: string, password: string): Promise<{ user: AuthUser | null; session: Session | null; error: string | null }> {
  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return { user: null, session: null, error: 'Invalid email or password' };
    }

    // Fetch user profile with API token
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, api_token')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      return { user: null, session: null, error: 'Failed to load user profile' };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        username: profileData.username,
        apiToken: profileData.api_token
      },
      session: authData.session,
      error: null
    };
  } catch (err) {
    return { user: null, session: null, error: err instanceof Error ? err.message : 'Login failed' };
  }
}

/**
 * Logout the current user
 */
export async function logoutUser(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Logout failed' };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<{ session: Session | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { session: null, error: error.message };
    }
    return { session: data.session, error: null };
  } catch (err) {
    return { session: null, error: err instanceof Error ? err.message : 'Failed to get session' };
  }
}

/**
 * Get current user with profile data
 */
export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { user: null, error: 'Not authenticated' };
    }

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, api_token')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profileData) {
      // If profile fetch fails, use email as username
      return {
        user: {
          id: authUser.id,
          email: authUser.email!,
          username: authUser.email!.split('@')[0],
          apiToken: null
        },
        error: null
      };
    }

    return {
      user: {
        id: authUser.id,
        email: authUser.email!,
        username: profileData.username,
        apiToken: profileData.api_token
      },
      error: null
    };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Failed to get user' };
  }
}

/**
 * Ensure user profile exists (creates one if it doesn't)
 * Note: Still used by registration flow
 */
export async function ensureUserProfile(): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ Error checking for profile:', selectError);
      return { success: false, error: selectError.message };
    }

    // If profile exists, we're good
    if (existingProfile) {
      console.log('✅ User profile already exists');
      return { success: true, error: null };
    }

    // Create profile if it doesn't exist
    console.log('📝 Creating missing user profile...');
    const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;

    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        username,
        api_token: null
      });

    if (insertError) {
      console.error('❌ Failed to create profile:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ User profile created successfully');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Unexpected error in ensureUserProfile:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to ensure profile' };
  }
}

/**
 * Update user's API token for a specific app
 */
export async function updateApiToken(
  appName: AppName,
  apiToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`🔍 updateApiToken: Starting update process for ${appName}...`);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ updateApiToken: No authenticated user found');
      return { success: false, error: 'Not authenticated' };
    }

    console.log(`✅ updateApiToken: User authenticated: ${user.id}`);

    // Calculate expiry time if provided
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Call new database function for app-specific tokens
    const { data, error } = await supabase.rpc('upsert_app_token', {
      p_user_id: user.id,
      p_app_name: appName,
      p_access_token: apiToken,
      p_refresh_token: refreshToken || null,
      p_access_token_expires_at: expiresAt
    });

    if (error) {
      console.error(`❌ updateApiToken: Database error for ${appName}:`, error);
      return { success: false, error: error.message };
    }

    if (!data || data.success !== true) {
      console.error(`❌ updateApiToken: Failed to save ${appName} token`);
      return { success: false, error: 'Failed to save token' };
    }

    console.log(`✅ updateApiToken: Successfully updated ${appName} token!`);
    return { success: true, error: null };
  } catch (err) {
    console.error(`❌ updateApiToken: Unexpected error for ${appName}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Update username
 */
export async function updateUsername(username: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Generate a cryptographically secure state token
 */
export function generateStateToken(): string {
  const array = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a PKCE code verifier
 * 32 random bytes, base64url-encoded (no padding), producing a 43-char string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "IhnjJ2pMrAc-fq-ZXpqvLkQHAyPxQYJgWJvcA8fsvgxPaB8f0PIiyxnczvli72GX"
  // return btoa(String.fromCharCode(...array))
  //   .replace(/\+/g, '-')
  //   .replace(/\//g, '_')
  //   .replace(/=/g, '');
}

/**
 * Generate a PKCE code challenge from a code verifier
 * SHA-256 hash of the verifier, base64url-encoded (no padding)
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  // const encoder = new TextEncoder();
  // const data = encoder.encode(verifier);
  // const digest = await crypto.subtle.digest('SHA-256', data);
return "lq4D1veJr7tMx9udhydfJb1KusQBeLrDt7Bz-70nqwQ"
  // return btoa(String.fromCharCode(...new Uint8Array(digest)))
  //   .replace(/\+/g, '-')
  //   .replace(/\//g, '_')
  //   .replace(/=/g, '');
}
/**
 * Create OAuth state and store in database
 * This must be called when user is authenticated
 * Pass codeVerifier to store a PKCE verifier alongside the state (Tater app only)
 */
export async function createOAuthState(expiresMinutes: number = 10, codeVerifier?: string): Promise<{ stateToken: string | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { stateToken: null, error: 'Not authenticated' };
    }

    const stateToken = generateStateToken();
    console.log('🔐 Creating OAuth state for user:', user.id);

    // Call the database function to create state
    const { data, error } = await supabase.rpc('create_oauth_state', {
      p_state_token: stateToken,
      p_user_id: user.id,
      p_expires_minutes: expiresMinutes,
      ...(codeVerifier ? { p_code_verifier: codeVerifier } : {})
    });

    if (error) {
      console.error('❌ Failed to create OAuth state:', error);
      return { stateToken: null, error: error.message };
    }

    console.log('✅ OAuth state created successfully:', data);
    return { stateToken, error: null };
  } catch (err) {
    console.error('❌ Unexpected error creating OAuth state:', err);
    return { stateToken: null, error: err instanceof Error ? err.message : 'Failed to create state' };
  }
}

/**
 * Consume OAuth state and get associated user ID (and optional PKCE code verifier)
 * This can be called WITHOUT authentication (in OAuth callback)
 */
export async function consumeOAuthState(stateToken: string): Promise<{ userId: string | null; codeVerifier: string | null; error: string | null }> {
  try {
    console.log('🔍 Consuming OAuth state:', stateToken.substring(0, 8) + '...');

    // Call the database function to consume state
    const { data, error } = await supabase.rpc('consume_oauth_state', {
      p_state_token: stateToken
    });

    if (error) {
      console.error('❌ Failed to consume OAuth state:', error);
      return { userId: null, codeVerifier: null, error: error.message };
    }

    // The function returns a single row with user_id, is_valid, error_message, code_verifier
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      console.error('❌ No result from consume_oauth_state');
      return { userId: null, codeVerifier: null, error: 'Invalid state token' };
    }

    if (!result.is_valid) {
      console.error('❌ State validation failed:', result.error_message);
      return { userId: null, codeVerifier: null, error: result.error_message || 'Invalid state token' };
    }

    console.log('✅ OAuth state consumed successfully for user:', result.user_id);
    return { userId: result.user_id, codeVerifier: result.code_verifier ?? null, error: null };
  } catch (err) {
    console.error('❌ Unexpected error consuming OAuth state:', err);
    return { userId: null, codeVerifier: null, error: err instanceof Error ? err.message : 'Failed to consume state' };
  }
}

/**
 * Update API token for a specific user and app (by user ID)
 * This is used in OAuth callback where we don't have an authenticated session
 * but we have the user ID from the state token
 */
export async function updateApiTokenForUser(
  userId: string,
  appName: AppName,
  apiToken: string,
  refreshToken?: string,
  expiresIn?: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`🔍 updateApiTokenForUser: Updating ${appName} token for user:`, userId);

    // Calculate expiry time if provided
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Use the database function that bypasses RLS with SECURITY DEFINER
    // This is necessary because OAuth callbacks happen in unauthenticated contexts
    console.log(`📝 Calling database function to upsert ${appName} token...`);
    const { data, error } = await supabase.rpc('upsert_app_token', {
      p_user_id: userId,
      p_app_name: appName,
      p_access_token: apiToken,
      p_refresh_token: refreshToken || null,
      p_access_token_expires_at: expiresAt
    });

    if (error) {
      console.error(`❌ Failed to upsert ${appName} token via function:`, error);
      return { success: false, error: error.message };
    }

    if (!data || data.success !== true) {
      console.warn(`⚠️ Failed to save ${appName} token`);
      return { success: false, error: 'Failed to save token' };
    }

    console.log(`✅ ${appName} token saved successfully via database function`);
    return { success: true, error: null };
  } catch (err) {
    console.error(`❌ Unexpected error updating ${appName} token:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Get a valid HubSpot access token for the current user
 * Automatically refreshes the token if it's expired or about to expire
 */
export async function getValidAccessToken(): Promise<{ token: string | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { token: null, error: 'Not authenticated' };
    }

    // Fetch user profile with tokens
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('api_token, refresh_token, access_token_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { token: null, error: 'Failed to fetch user profile' };
    }

    // If no access token at all, user needs to authenticate with HubSpot
    if (!profile.api_token) {
      return { token: null, error: 'No HubSpot access token found. Please authenticate with HubSpot.' };
    }

    // Check if token is expired or will expire in the next 5 minutes
    const now = new Date();
    const expiresAt = profile.access_token_expires_at ? new Date(profile.access_token_expires_at) : null;
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const isExpiredOrExpiringSoon = !expiresAt || expiresAt <= fiveMinutesFromNow;

    // If token is still valid, return it
    if (!isExpiredOrExpiringSoon) {
      console.log('✅ Access token is still valid');
      return { token: profile.api_token, error: null };
    }

    // Token is expired or expiring soon, try to refresh it
    console.log('🔄 Access token expired or expiring soon, refreshing...');

    if (!profile.refresh_token) {
      return { token: null, error: 'Access token expired and no refresh token available. Please re-authenticate with HubSpot.' };
    }

    // Call our API to refresh the token
    const response = await fetch('/api/refresh-hubspot-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: profile.refresh_token,
        client_id: import.meta.env.VITE_HUBSPOT_CLIENT_ID,
        client_secret: import.meta.env.VITE_HUBSPOT_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Token refresh failed:', errorData);
      return { token: null, error: 'Failed to refresh access token. Please re-authenticate with HubSpot.' };
    }

    const tokenData = await response.json();

    // Save the new tokens
    const updateResult = await updateApiToken(
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    if (!updateResult.success) {
      console.error('❌ Failed to save refreshed token:', updateResult.error);
      // Return the token anyway since we got it, but log the error
      return { token: tokenData.access_token, error: null };
    }

    console.log('✅ Access token refreshed successfully');
    return { token: tokenData.access_token, error: null };
  } catch (err) {
    console.error('❌ Error getting valid access token:', err);
    return { token: null, error: err instanceof Error ? err.message : 'Failed to get access token' };
  }
}

/**
 * Get app-specific token for the current user
 */
export async function getAppToken(
  appName: AppName
): Promise<{ token: string | null; refreshToken: string | null; expiresAt: string | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { token: null, refreshToken: null, expiresAt: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('app_tokens')
      .select('access_token, refresh_token, access_token_expires_at')
      .eq('user_id', user.id)
      .eq('app_name', appName)
      .single();

    if (error || !data) {
      console.log(`⚠️ No ${appName} token found for user`);
      return { token: null, refreshToken: null, expiresAt: null, error: `No ${appName} token found. Please authenticate this app.` };
    }

    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.access_token_expires_at,
      error: null
    };
  } catch (err) {
    console.error(`❌ Error getting ${appName} token:`, err);
    return { token: null, refreshToken: null, expiresAt: null, error: err instanceof Error ? err.message : 'Failed to get token' };
  }
}

/**
 * Get all installed apps for the current user
 */
export async function getInstalledApps(): Promise<{ apps: AppName[]; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { apps: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('app_tokens')
      .select('app_name')
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error fetching installed apps:', error);
      return { apps: [], error: error.message };
    }

    const apps = (data || []).map(row => row.app_name as AppName);
    return { apps, error: null };
  } catch (err) {
    console.error('❌ Error getting installed apps:', err);
    return { apps: [], error: err instanceof Error ? err.message : 'Failed to get apps' };
  }
}

