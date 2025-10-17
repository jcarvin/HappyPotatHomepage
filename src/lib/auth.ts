import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

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
 */
async function ensureUserProfile(): Promise<{ success: boolean; error: string | null }> {
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
 * Update user's API token
 */
export async function updateApiToken(apiToken: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('🔍 updateApiToken: Starting update process...');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ updateApiToken: No authenticated user found');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('✅ updateApiToken: User authenticated:', user.id);

    // Ensure profile exists before updating
    const { success: profileExists, error: profileError } = await ensureUserProfile();
    if (!profileExists) {
      console.error('❌ updateApiToken: Could not ensure profile exists:', profileError);
      return { success: false, error: profileError };
    }

    console.log('📝 updateApiToken: Attempting to update token for user...');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ api_token: apiToken })
      .eq('id', user.id)
      .select(); // Add select to see what was updated

    if (error) {
      console.error('❌ updateApiToken: Database error:', error);
      return { success: false, error: error.message };
    }

    console.log('📊 updateApiToken: Update result:', data);

    if (!data || data.length === 0) {
      console.warn('⚠️ updateApiToken: No rows were updated even after ensuring profile exists!');
      return { success: false, error: 'Failed to update profile. Please check database permissions.' };
    }

    console.log('✅ updateApiToken: Successfully updated token!');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ updateApiToken: Unexpected error:', err);
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
 * Create OAuth state and store in database
 * This must be called when user is authenticated
 */
export async function createOAuthState(expiresMinutes: number = 10): Promise<{ stateToken: string | null; error: string | null }> {
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
      p_expires_minutes: expiresMinutes
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
 * Consume OAuth state and get associated user ID
 * This can be called WITHOUT authentication (in OAuth callback)
 */
export async function consumeOAuthState(stateToken: string): Promise<{ userId: string | null; error: string | null }> {
  try {
    console.log('🔍 Consuming OAuth state:', stateToken.substring(0, 8) + '...');

    // Call the database function to consume state
    const { data, error } = await supabase.rpc('consume_oauth_state', {
      p_state_token: stateToken
    });

    if (error) {
      console.error('❌ Failed to consume OAuth state:', error);
      return { userId: null, error: error.message };
    }

    // The function returns a single row with user_id, is_valid, error_message
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      console.error('❌ No result from consume_oauth_state');
      return { userId: null, error: 'Invalid state token' };
    }

    if (!result.is_valid) {
      console.error('❌ State validation failed:', result.error_message);
      return { userId: null, error: result.error_message || 'Invalid state token' };
    }

    console.log('✅ OAuth state consumed successfully for user:', result.user_id);
    return { userId: result.user_id, error: null };
  } catch (err) {
    console.error('❌ Unexpected error consuming OAuth state:', err);
    return { userId: null, error: err instanceof Error ? err.message : 'Failed to consume state' };
  }
}

/**
 * Update API token for a specific user (by user ID)
 * This is used in OAuth callback where we don't have an authenticated session
 * but we have the user ID from the state token
 */
export async function updateApiTokenForUser(userId: string, apiToken: string): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log('🔍 updateApiTokenForUser: Updating token for user:', userId);

    // First check if profile exists to determine username
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    let username: string;
    if (existingProfile?.username) {
      // Use existing username
      username = existingProfile.username;
      console.log('✅ Found existing username:', username);
    } else {
      // Generate a default username (we can't access auth.admin without service role key)
      username = `user_${userId.slice(0, 8)}`;
      console.log('📝 Using default username:', username);
    }

    // Use UPSERT to insert or update atomically
    // This prevents race conditions and duplicate key errors
    console.log('📝 Upserting profile with token...');
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          username: username,
          api_token: apiToken
        },
        {
          onConflict: 'id', // Specify which column to check for conflicts
          ignoreDuplicates: false // Update if exists
        }
      )
      .select();

    if (error) {
      console.error('❌ Failed to upsert profile:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No rows affected by upsert');
      return { success: false, error: 'Failed to save profile' };
    }

    console.log('✅ Token saved successfully via upsert');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Unexpected error updating token:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

