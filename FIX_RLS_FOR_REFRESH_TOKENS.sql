-- Fix RLS policies to allow reading refresh token columns
-- The 406 error is likely because RLS is blocking access to the new columns

-- First, let's see what policies exist
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Drop and recreate the SELECT policy to ensure it allows all columns
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON user_profiles;

-- Create a comprehensive SELECT policy
CREATE POLICY "Users can read their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Also ensure service role can read everything (for server-side operations)
CREATE POLICY "Service role can read all profiles"
ON user_profiles
FOR SELECT
TO service_role
USING (true);

