import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export interface UserCredentials {
  email: string;
  password: string;
  username: string;
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
 * Update user's API token
 */
export async function updateApiToken(apiToken: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ api_token: apiToken })
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

