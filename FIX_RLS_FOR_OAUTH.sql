-- Fix RLS Policy for OAuth Token Updates
-- This allows updating api_token from unauthenticated contexts (OAuth callback in iframe)

-- Create a function to upsert user profile with api_token
-- SECURITY DEFINER means it runs with the permissions of the owner (bypasses RLS)
CREATE OR REPLACE FUNCTION upsert_user_api_token(
  p_user_id UUID,
  p_username TEXT,
  p_api_token TEXT
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- Upsert the profile
  INSERT INTO user_profiles (id, username, api_token)
  VALUES (p_user_id, p_username, p_api_token)
  ON CONFLICT (id)
  DO UPDATE SET
    api_token = EXCLUDED.api_token,
    updated_at = NOW()
  RETURNING json_build_object(
    'id', id,
    'username', username,
    'success', true
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION upsert_user_api_token TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_api_token TO anon;

-- Add a comment explaining the function
COMMENT ON FUNCTION upsert_user_api_token IS
'Safely upserts user api_token from OAuth callback. Uses SECURITY DEFINER to bypass RLS since OAuth callbacks happen in unauthenticated contexts.';

