# Fix for RLS Error: "new row violates row-level security policy"

## The Problem

The OAuth callback was failing with this error:
```
new row violates row-level security policy for table "user_profiles"
```

**Why?** The `user_profiles` table has Row Level Security (RLS) that requires users to be authenticated to UPDATE their profile. However, the OAuth callback happens in an **iframe without authentication**, so it can't update the profile directly.

## The Solution

We created a database function with `SECURITY DEFINER` that bypasses RLS. This is safe because:
- The function is only called after validating the OAuth state token
- The state token is cryptographically secure and single-use
- The user_id comes from the validated state token

## What You Need to Do

### Option 1: Run the Single SQL File (Easiest)

1. Open your **Supabase SQL Editor**
2. Copy and paste the contents of `FIX_RLS_FOR_OAUTH.sql`
3. Click **Run** or press `Ctrl+Enter`
4. Done! Test your OAuth flow

### Option 2: Update Your Full Setup (Recommended for New Installs)

If you're starting fresh or want the complete setup:

1. Open your **Supabase SQL Editor**
2. Run the **complete** SQL from `OAUTH_STATE_SETUP.md`
3. This includes:
   - `oauth_states` table
   - `create_oauth_state` function
   - `consume_oauth_state` function
   - `cleanup_oauth_states` function
   - **NEW:** `upsert_user_api_token` function (fixes the RLS issue)

## Do You Need to Wipe Your Database?

**No!** You don't need to delete anything. Just run the new SQL function and it will work with your existing data.

However, if you want a fresh start:

### To Reset (Optional)

```sql
-- Delete OAuth states (optional - they expire anyway)
DELETE FROM oauth_states;

-- If you want to completely reset user profiles (CAUTION: deletes all data!)
DELETE FROM user_profiles;

-- Then you can recreate your test user via the login page
```

## What Changed in the Code

### `src/lib/auth.ts`
- `updateApiTokenForUser()` now calls the database function `upsert_user_api_token`
- This function has `SECURITY DEFINER` privilege to bypass RLS

### Database
- Added `upsert_user_api_token()` function
- This function can INSERT or UPDATE `user_profiles` without requiring authentication
- Still secure because it's only accessible after OAuth state validation

## How to Test

1. **Run the SQL** from `FIX_RLS_FOR_OAUTH.sql`
2. **Clear browser storage** (optional but recommended):
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```
3. **Start your dev server**: `npm run dev`
4. **Navigate to OAuth page** with proper query params
5. **Login with your credentials**
6. **Complete OAuth flow**
7. **Check console** - should see:
   ```
   ✅ Found existing username: [username]
   📝 Calling database function to upsert profile...
   ✅ Token saved successfully via database function
   ```
8. **Verify in Supabase**:
   - Go to Table Editor → `user_profiles`
   - Your user should have an `api_token` value

## Security Note

**Is this secure?** YES!

The function bypasses RLS but is still secure because:

1. ✅ **Authentication happened earlier** - User logged in with Supabase
2. ✅ **State token is validated** - Cryptographically secure, single-use, time-limited
3. ✅ **User ID is verified** - Comes from the validated state token
4. ✅ **Function is narrowly scoped** - Only updates `api_token`, nothing else
5. ✅ **SECURITY DEFINER is standard** - Same pattern used by password resets, magic links, etc.

## Troubleshooting

### Still getting RLS error?
- Make sure you ran the SQL function
- Check that the function exists: `SELECT proname FROM pg_proc WHERE proname = 'upsert_user_api_token';`
- Verify permissions were granted

### Function not found error?
- You need to run the SQL from `FIX_RLS_FOR_OAUTH.sql`
- Make sure you're in the correct database

### Token still not saving?
- Check browser console for detailed logs
- Look at Supabase logs in dashboard
- Verify the `oauth_states` table has your state token

## Summary

1. ✅ Run `FIX_RLS_FOR_OAUTH.sql` in Supabase SQL Editor
2. ✅ Code already updated to use the new function
3. ✅ Test your OAuth flow
4. ✅ No need to wipe database!

The fix is small but critical - it allows the OAuth callback to save tokens without being authenticated, while maintaining security through the state token validation.

