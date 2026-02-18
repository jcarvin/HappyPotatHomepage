# MCP Portal Tracking Fix

## Problem

The MCP OAuth flow was not properly linking MCP access tokens to specific HubSpot portals. This caused issues when:
- Multiple portals had the Loaded Potat app installed
- The MCP handler couldn't determine which portal's credentials to use
- Requests would randomly use the most recent app installation

## Root Cause

The OAuth authorization and token exchange endpoints were **not capturing or storing the HubSpot portal ID** during the OAuth flow. The system would later try to guess which portal to use, which failed in multi-portal scenarios.

### Old Flow (Broken)
```
1. HubSpot initiates MCP OAuth
2. /api/oauth/authorize generates auth code (NO portal tracking)
3. /api/oauth/token exchanges code for MCP token (NO portal tracking)
4. /api/mcp/handler receives MCP token
5. Handler tries to guess which portal (❌ FAILS)
```

### New Flow (Fixed)
```
1. HubSpot initiates MCP OAuth with portal_id
2. /api/oauth/authorize captures portal_id, stores with auth code ✅
3. /api/oauth/token exchanges code, stores portal_id with MCP token ✅
4. /api/mcp/handler receives MCP token
5. Handler looks up exact portal from MCP registration ✅
```

## Changes Made

### 1. Database Schema
**File:** `migrations/add_portal_id_to_mcp_registrations.sql`

Added `hubspot_portal_id` column to both tables:
- `mcp_oauth_codes` - Stores portal ID with temporary auth code
- `mcp_user_registrations` - Stores portal ID with long-lived MCP token

### 2. TypeScript Types
**File:** `api/oauth/types.ts`

Updated interfaces to include `hubspot_portal_id`:
- `AuthorizationRequest` - Now accepts `portal_id` / `hubspot_portal_id` parameters
- `AuthCodeData` - Stores portal ID with auth code
- `MCPUserRegistration` - Stores portal ID with MCP token

### 3. Authorization Endpoint
**File:** `api/oauth/authorize.ts`

- Extracts portal ID from query parameters (`portal_id` or `hubspot_portal_id`)
- Stores portal ID with authorization code
- Logs portal ID for debugging

### 4. Token Exchange Endpoint
**File:** `api/oauth/token.ts`

- Passes portal ID from auth code to MCP registration
- Stores portal ID with access/refresh tokens
- Logs portal ID for debugging

### 5. MCP Authentication
**File:** `api/mcp/auth.ts`

- Uses portal ID from MCP registration (primary source)
- Falls back to `X-HubSpot-Portal-Id` header if needed
- Only uses "most recent app installation" as last resort
- Better error messages showing which portal lookup failed

## Deployment Steps

### Step 1: Run Database Migration

In Supabase SQL Editor, run:

```sql
-- Add portal_id to MCP user registrations
ALTER TABLE mcp_user_registrations 
ADD COLUMN IF NOT EXISTS hubspot_portal_id TEXT;

CREATE INDEX IF NOT EXISTS idx_mcp_registrations_portal 
ON mcp_user_registrations(hubspot_portal_id);

-- Add portal_id to oauth codes table
ALTER TABLE mcp_oauth_codes 
ADD COLUMN IF NOT EXISTS hubspot_portal_id TEXT;
```

### Step 2: Deploy Code Changes

```bash
git add .
git commit -m "Fix: Add portal ID tracking to MCP OAuth flow"
git push
```

Wait for Vercel deployment to complete.

### Step 3: Test the Fix

1. **Clear existing MCP registrations** (optional, for clean test):
   ```sql
   DELETE FROM mcp_user_registrations WHERE client_id = 'loadedpotat-mcp';
   DELETE FROM mcp_oauth_codes WHERE client_id = 'loadedpotat-mcp';
   ```

2. **Install the app in a test portal**:
   - Visit `/loaded-potat-oauth?step=authorize`
   - Complete OAuth flow
   - Note the portal ID

3. **Connect MCP in Breeze Studio**:
   - Go to Breeze Agent Studio
   - Add the MCP server
   - Complete OAuth authorization
   - Check logs to verify portal ID was captured

4. **Verify database**:
   ```sql
   SELECT 
     access_token,
     hubspot_portal_id,
     scopes,
     created_at
   FROM mcp_user_registrations 
   WHERE client_id = 'loadedpotat-mcp'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   
   The `hubspot_portal_id` should be populated!

5. **Test MCP tool execution**:
   - In Breeze, ask: "Create a contact named Test User"
   - Check logs to see: `🎯 Looking up HubSpot tokens for portal: 123456789`

### Step 4: Monitor Logs

Check Vercel logs for these messages:

**During Authorization:**
```
✅ OAuth authorization successful: { portal_id: '123456789', ... }
```

**During Token Exchange:**
```
✅ OAuth token exchange successful: { portal_id: '123456789', ... }
```

**During MCP Tool Call:**
```
🎯 Looking up HubSpot tokens for portal: 123456789
✅ MCP request authenticated: { portal_id: '123456789', ... }
```

## How HubSpot Provides Portal ID

HubSpot may provide the portal ID in several ways during the OAuth authorization:

1. **Query Parameter:** `portal_id=123456789`
2. **Alternative Parameter:** `hubspot_portal_id=123456789`
3. **State Parameter:** Encoded in the state (would need parsing)
4. **Header:** `X-HubSpot-Portal-Id` (we check this too)

Our code checks all these sources.

## Fallback Behavior

If portal ID is NOT provided (shouldn't happen with HubSpot, but just in case):

1. System will log: `⚠️ No portal ID available - using most recent app installation`
2. Will still work if only one portal has the app installed
3. May fail or use wrong portal if multiple portals installed

## Troubleshooting

### Issue: Portal ID not being captured

**Check authorization logs:**
```
✅ OAuth authorization successful: { portal_id: 'not provided', ... }
```

**Solutions:**
- Check if HubSpot is sending `portal_id` parameter
- Check the full URL HubSpot redirects to
- May need to extract from state parameter

### Issue: Wrong portal's credentials being used

**Check MCP handler logs:**
```
⚠️ No portal ID available - using most recent app installation
```

**Solutions:**
- Verify portal ID was stored during OAuth (check database)
- Ensure portal has the app installed
- Check that portal IDs match between `mcp_user_registrations` and `app_tokens`

### Issue: "No HubSpot credentials found"

**Error message shows:**
```
No HubSpot credentials found for portal 123456789
```

**Solutions:**
- Install Loaded Potat app in that specific portal
- Check `app_tokens` table for that portal ID
- Verify the app installation completed successfully

## Future Improvements

1. **UI for portal selection**: If HubSpot doesn't provide portal ID, show a page where user selects their portal
2. **Portal validation**: Verify portal ID exists in `app_tokens` before storing
3. **Multi-portal support**: Allow one MCP token to access multiple portals
4. **Better error messages**: Show user which portal they need to install the app in

## Related Files

- `/api/oauth/authorize.ts` - Captures portal ID during authorization
- `/api/oauth/token.ts` - Stores portal ID with MCP token
- `/api/mcp/auth.ts` - Uses portal ID for credential lookup
- `/api/mcp/handler.ts` - Validates requests with correct portal
- `migrations/add_portal_id_to_mcp_registrations.sql` - Database schema update

## Testing Checklist

- [ ] Database migration applied
- [ ] Code deployed to Vercel
- [ ] Single portal test passed
- [ ] Multi-portal test passed (if applicable)
- [ ] Logs show portal ID being captured
- [ ] Logs show portal ID being used for lookup
- [ ] MCP tools work correctly
- [ ] Error messages are helpful

---

**Last Updated:** February 12, 2026
