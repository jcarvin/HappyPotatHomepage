-- Run this in Supabase SQL Editor to verify columns exist
-- This will show you the structure of your user_profiles table

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Also check if the columns have data
SELECT
  COUNT(*) as total_rows,
  COUNT(api_token) as rows_with_api_token,
  COUNT(refresh_token) as rows_with_refresh_token,
  COUNT(access_token_expires_at) as rows_with_expiry
FROM user_profiles;

