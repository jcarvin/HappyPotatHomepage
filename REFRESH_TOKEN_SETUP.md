# HubSpot OAuth Refresh Token Implementation

This document explains how the HubSpot OAuth refresh token system works in this application.

## Overview

HubSpot OAuth 2.0 provides two types of tokens:
- **Access Token**: Expires in ~6 hours (21600 seconds)
- **Refresh Token**: Long-lived token used to obtain new access tokens

This implementation automatically handles token refresh, so you never have to worry about expired tokens!

## 🗄️ Database Schema

### New Columns in `user_profiles` Table

```sql
-- Stores the HubSpot refresh token
refresh_token TEXT

-- Tracks when the current access token expires
access_token_expires_at TIMESTAMPTZ
```

### Updated Database Function

The `upsert_user_api_token` function now accepts:
- `p_user_id` - User UUID
- `p_username` - Username
- `p_api_token` - HubSpot access token
- `p_refresh_token` - HubSpot refresh token (optional)
- `p_access_token_expires_at` - Token expiry timestamp (optional)

## 🔄 How It Works

### 1. Initial OAuth Flow

When a user authenticates with HubSpot:

```typescript
// OAuth callback receives authorization code
const code = getQueryParam('code');

// Exchange code for tokens
const response = await fetch('https://your-proxy.com/exchange_code', {
  method: 'POST',
  body: JSON.stringify({ code, client_id, client_secret, redirect_uri })
});

const data = await response.json();
// data = {
//   access_token: "...",
//   refresh_token: "...",
//   expires_in: 21600
// }

// Save both tokens to database
await updateApiToken(
  data.access_token,
  data.refresh_token,
  data.expires_in
);
```

### 2. Using Tokens

Whenever you need to make a HubSpot API call, use `getValidAccessToken()`:

```typescript
import { getValidAccessToken } from './lib/auth';

// This function automatically refreshes if expired!
const { token, error } = await getValidAccessToken();

if (error) {
  console.error('Failed to get token:', error);
  // Redirect user to re-authenticate
  return;
}

// Use the token for HubSpot API calls
const response = await fetch('https://api.hubapi.com/...', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Automatic Token Refresh

The `getValidAccessToken()` function:
1. Checks if the access token exists
2. Checks if the token is expired or will expire in the next 5 minutes
3. If expired/expiring, automatically refreshes using the refresh token
4. Saves the new tokens to the database
5. Returns the valid access token

```typescript
// Internal logic (simplified)
export async function getValidAccessToken() {
  // Get current tokens from database
  const profile = await fetchUserProfile();

  // Check if expired or expiring soon
  const isExpired = profile.access_token_expires_at <= (now + 5 minutes);

  if (!isExpired) {
    return profile.api_token; // Still valid!
  }

  // Refresh the token
  const newTokens = await fetch('/api/refresh-hubspot-token', {
    body: { refresh_token: profile.refresh_token }
  });

  // Save new tokens
  await updateApiToken(newTokens.access_token, newTokens.refresh_token, newTokens.expires_in);

  return newTokens.access_token;
}
```

## 🔧 API Endpoints

### POST /api/refresh-hubspot-token

Refreshes an expired access token using a refresh token.

**Request:**
```json
{
  "refresh_token": "your-hubspot-refresh-token"
}
```

**Response:**
```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token",
  "expires_in": 21600
}
```

**Note**: HubSpot may return a new refresh token. Always save the new one!

## 📝 Database Migration Steps

Run these SQL scripts in your Supabase SQL Editor **in order**:

### Step 1: Add Refresh Token Columns

```bash
# File: ADD_REFRESH_TOKEN_MIGRATION.sql
```

This adds:
- `refresh_token` column
- `access_token_expires_at` column
- Index for faster lookups
- RLS policies

### Step 2: Update Database Function

```bash
# File: UPDATE_UPSERT_FUNCTION.sql
```

This updates the `upsert_user_api_token` function to handle the new fields.

## 💻 Code Examples

### Example: Fetching HubSpot Account Info

```typescript
import { getValidAccessToken } from '../lib/auth';

async function fetchHubSpotData() {
  // Get a valid token (auto-refreshes if needed)
  const { token, error } = await getValidAccessToken();

  if (error) {
    console.error('Authentication required:', error);
    // Redirect to OAuth page
    window.location.href = '/oauth?returnUrl=' + window.location.href;
    return;
  }

  // Make your API call
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('HubSpot data:', data);
}
```

### Example: Custom API with Token Refresh

```typescript
// api/hubspot-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get user from session
  const userId = req.headers['x-user-id']; // However you pass user context

  // Fetch user's tokens
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('api_token, refresh_token, access_token_expires_at')
    .eq('id', userId)
    .single();

  let token = profile.api_token;

  // Check if expired
  const isExpired = new Date(profile.access_token_expires_at) <= new Date();

  if (isExpired) {
    // Refresh token
    const refreshResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.VITE_HUBSPOT_CLIENT_ID!,
        client_secret: process.env.VITE_HUBSPOT_CLIENT_SECRET!,
        refresh_token: profile.refresh_token
      })
    });

    const newTokens = await refreshResponse.json();
    token = newTokens.access_token;

    // Save new tokens
    await supabase
      .from('user_profiles')
      .update({
        api_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        access_token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000)
      })
      .eq('id', userId);
  }

  // Make HubSpot API call with valid token
  const hubspotResponse = await fetch('https://api.hubapi.com/...', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await hubspotResponse.json();
  return res.json(data);
}
```

## 🔒 Security Considerations

1. **Never expose refresh tokens to the client**: Always keep refresh tokens server-side or in secure database
2. **Use HTTPS**: All token exchanges must happen over HTTPS
3. **RLS Policies**: Ensure users can only access their own tokens
4. **Token Rotation**: HubSpot may issue new refresh tokens - always save the new one
5. **Expiry Buffer**: We refresh tokens 5 minutes before expiry to avoid race conditions

## 🚨 Error Handling

### Common Errors

**"No HubSpot access token found"**
- User has never authenticated with HubSpot
- Redirect them to the OAuth flow

**"Access token expired and no refresh token available"**
- Refresh token is missing or invalid
- User needs to re-authenticate with HubSpot

**"Failed to refresh access token"**
- Refresh token may be revoked
- HubSpot API may be down
- User needs to re-authenticate with HubSpot

### Handling Re-authentication

```typescript
const { token, error } = await getValidAccessToken();

if (error) {
  if (error.includes('No HubSpot access token') ||
      error.includes('no refresh token available') ||
      error.includes('Failed to refresh')) {
    // Redirect to OAuth flow
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/oauth?returnUrl=${returnUrl}`;
  }
}
```

## 📊 Token Lifecycle

```
┌─────────────────┐
│ User clicks     │
│ "Connect        │
│ HubSpot"        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OAuth Flow      │
│ - Get code      │
│ - Exchange for  │
│   tokens        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to DB      │
│ - access_token  │
│ - refresh_token │
│ - expires_at    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ App makes       │
│ API call        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check expiry    │◄──────┐
└────────┬────────┘       │
         │                │
    ┌────▼────┐           │
    │Expired? │           │
    └────┬────┘           │
         │                │
    Yes  │  No            │
    ┌────▼────┐      ┌────┴─────┐
    │ Refresh │      │ Use      │
    │ Token   │      │ Existing │
    └────┬────┘      │ Token    │
         │           └──────────┘
         │
         └───────────────┘
```

## ✅ Testing Checklist

- [ ] Run `ADD_REFRESH_TOKEN_MIGRATION.sql` in Supabase
- [ ] Run `UPDATE_UPSERT_FUNCTION.sql` in Supabase
- [ ] Deploy updated code to Vercel
- [ ] Test initial OAuth flow (should save refresh token)
- [ ] Check database - verify tokens are saved
- [ ] Wait for token to expire (~6 hours) OR manually set expiry to past
- [ ] Call `getValidAccessToken()` - should auto-refresh
- [ ] Verify new tokens are saved in database

## 🎯 Best Practices

1. **Always use `getValidAccessToken()`** instead of directly reading `api_token` from the database
2. **Handle errors gracefully** - redirect users to re-authenticate when needed
3. **Log token refreshes** - helps with debugging OAuth issues
4. **Test token expiry** - manually set expiry in past to test refresh flow
5. **Monitor refresh failures** - may indicate revoked access or app issues

## 🔗 Related Files

- `/src/lib/auth.ts` - Main auth functions including `getValidAccessToken()`
- `/api/refresh-hubspot-token.ts` - API endpoint for token refresh
- `/src/pages/OAuthPage.tsx` - OAuth callback handler
- `ADD_REFRESH_TOKEN_MIGRATION.sql` - Database schema migration
- `UPDATE_UPSERT_FUNCTION.sql` - Database function update

