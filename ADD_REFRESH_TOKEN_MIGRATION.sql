-- Add refresh token and token expiry fields to user_profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

-- Create index for faster lookups when checking token expiry
CREATE INDEX IF NOT EXISTS idx_user_profiles_token_expiry
ON user_profiles(access_token_expires_at);

-- Update RLS policies to allow users to update their own refresh tokens
-- (This should already be covered by existing policies, but let's be explicit)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own profile tokens" ON user_profiles;

-- Create policy allowing users to update their own tokens
CREATE POLICY "Users can update their own profile tokens"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Comment for documentation
COMMENT ON COLUMN user_profiles.refresh_token IS 'HubSpot OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN user_profiles.access_token_expires_at IS 'Timestamp when the current access token expires';

