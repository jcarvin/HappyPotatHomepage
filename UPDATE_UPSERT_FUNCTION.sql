-- Update the upsert_user_api_token function to handle refresh tokens
-- Run this in your Supabase SQL Editor AFTER running ADD_REFRESH_TOKEN_MIGRATION.sql

-- Drop the old function (both old and new signatures)
DROP FUNCTION IF EXISTS upsert_user_api_token(uuid, text, text);
DROP FUNCTION IF EXISTS upsert_user_api_token(uuid, text, text, text, timestamptz);

-- Create updated function with refresh token support
CREATE OR REPLACE FUNCTION upsert_user_api_token(
  p_user_id UUID,
  p_username TEXT,
  p_api_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_access_token_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user profile with OAuth tokens
  INSERT INTO user_profiles (
    id,
    username,
    api_token,
    refresh_token,
    access_token_expires_at
  )
  VALUES (
    p_user_id,
    p_username,
    p_api_token,
    p_refresh_token,
    p_access_token_expires_at
  )
  ON CONFLICT (id)
  DO UPDATE SET
    username = COALESCE(user_profiles.username, p_username),
    api_token = p_api_token,
    refresh_token = COALESCE(p_refresh_token, user_profiles.refresh_token),
    access_token_expires_at = COALESCE(p_access_token_expires_at, user_profiles.access_token_expires_at);

  -- Return success indicator
  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_user_api_token(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_api_token(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO anon;

COMMENT ON FUNCTION upsert_user_api_token IS 'Upserts user profile with HubSpot OAuth tokens (access token, refresh token, and expiry). Uses SECURITY DEFINER to bypass RLS for OAuth callbacks.';

