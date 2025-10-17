# 🚀 Refresh Token Setup - Quick Start

## What Changed?

Your OAuth flow now saves **refresh tokens** instead of just access tokens. This means tokens can be automatically refreshed when they expire (~6 hours), so users don't have to re-authenticate!

## 📋 Setup Steps (Required)

### 1. Run Database Migrations

Open your Supabase SQL Editor and run these files **in order**:

#### Step 1: Add refresh token columns
```sql
-- Copy and paste from: ADD_REFRESH_TOKEN_MIGRATION.sql
```

#### Step 2: Update the upsert function
```sql
-- Copy and paste from: UPDATE_UPSERT_FUNCTION.sql
```

### 2. Deploy to Vercel

Your code changes are ready! Just deploy:

```bash
git add .
git commit -m "Add refresh token support"
git push
```

Vercel will automatically deploy your updated API endpoints.

## ✅ What's Already Done

- ✅ Database schema designed (need to run migrations)
- ✅ `auth.ts` updated to handle refresh tokens
- ✅ OAuth flow updated to save refresh tokens
- ✅ API endpoint created: `/api/refresh-hubspot-token`
- ✅ Helper function created: `getValidAccessToken()`

## 🎯 How to Use

### Before (Old Way - No Refresh)
```typescript
// Access token expires after 6 hours
const { data: profile } = await supabase
  .from('user_profiles')
  .select('api_token')
  .eq('id', user.id)
  .single();

const response = await fetch('https://api.hubapi.com/...', {
  headers: { 'Authorization': `Bearer ${profile.api_token}` }
});
```

### After (New Way - Auto Refresh! 🎉)
```typescript
import { getValidAccessToken } from './lib/auth';

// Automatically refreshes if expired!
const { token, error } = await getValidAccessToken();

if (error) {
  // Redirect to re-authenticate
  window.location.href = '/oauth?returnUrl=' + window.location.href;
  return;
}

const response = await fetch('https://api.hubapi.com/...', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🧪 Testing Your Setup

### 1. Test New OAuth Flow

1. Go through OAuth flow (connect HubSpot)
2. Check your database:
   ```sql
   SELECT
     api_token IS NOT NULL as has_access_token,
     refresh_token IS NOT NULL as has_refresh_token,
     access_token_expires_at
   FROM user_profiles
   WHERE id = 'your-user-id';
   ```
3. You should see both tokens saved!

### 2. Test Token Refresh

Option A: Wait 6 hours (patient way 😴)

Option B: Manually expire the token (quick way ⚡)
```sql
-- Force token to be expired
UPDATE user_profiles
SET access_token_expires_at = NOW() - INTERVAL '1 hour'
WHERE id = 'your-user-id';
```

Then call `getValidAccessToken()` - it should automatically refresh!

## 📁 New Files

```
├── api/
│   ├── hubspot-token-info.ts        (existing)
│   └── refresh-hubspot-token.ts     ⭐ NEW - Refreshes tokens
├── src/lib/
│   └── auth.ts                       ⭐ UPDATED - New functions
├── src/pages/
│   └── OAuthPage.tsx                 ⭐ UPDATED - Saves refresh tokens
├── ADD_REFRESH_TOKEN_MIGRATION.sql   ⭐ NEW - Run this first
├── UPDATE_UPSERT_FUNCTION.sql        ⭐ NEW - Run this second
└── REFRESH_TOKEN_SETUP.md            📖 Full documentation
```

## 🔍 Verification Checklist

After setup, verify:

- [ ] Migrations ran successfully in Supabase
- [ ] New columns exist: `refresh_token`, `access_token_expires_at`
- [ ] OAuth flow completes successfully
- [ ] Both tokens are saved to database
- [ ] `getValidAccessToken()` returns a token
- [ ] Manual token expiry test works (auto-refreshes)

## 🆘 Troubleshooting

### "Column refresh_token does not exist"
- You didn't run `ADD_REFRESH_TOKEN_MIGRATION.sql`
- Run it in Supabase SQL Editor

### "Function upsert_user_api_token with 5 parameters not found"
- You didn't run `UPDATE_UPSERT_FUNCTION.sql`
- Run it in Supabase SQL Editor

### "Failed to refresh token"
- Check that environment variables are set in Vercel
- `VITE_HUBSPOT_CLIENT_ID`
- `VITE_HUBSPOT_CLIENT_SECRET`

### Tokens not being saved
- Check Supabase RLS policies
- Verify user is authenticated when saving
- Check browser console for errors

## 📚 Learn More

- **REFRESH_TOKEN_SETUP.md** - Complete documentation with examples
- **API_SETUP.md** - Information about API endpoints
- **OAuth 2.0 Refresh Tokens** - https://oauth.net/2/grant-types/refresh-token/

## 🎉 Benefits

✅ **No more expired tokens** - Automatically refreshed
✅ **Better user experience** - Users stay logged in
✅ **Secure** - Refresh tokens stored server-side
✅ **Standard OAuth 2.0** - Industry best practice
✅ **Easy to use** - Just call `getValidAccessToken()`

---

**Ready to deploy?** Just run the migrations and push your code! 🚀

