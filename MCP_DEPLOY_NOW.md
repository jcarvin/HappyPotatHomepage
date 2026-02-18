# MCP Fix - Deploy Now!

Quick reference for deploying the portal tracking fix.

## Step 1: Database (Supabase SQL Editor)

```sql
-- Add portal_id columns
ALTER TABLE mcp_user_registrations 
ADD COLUMN IF NOT EXISTS hubspot_portal_id TEXT;

ALTER TABLE mcp_oauth_codes 
ADD COLUMN IF NOT EXISTS hubspot_portal_id TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_mcp_registrations_portal 
ON mcp_user_registrations(hubspot_portal_id);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mcp_user_registrations';
```

Expected output should include:
- `hubspot_portal_id | text`

## Step 2: Deploy Code

```bash
git add .
git commit -m "Fix: Add portal ID tracking to MCP OAuth flow"
git push
```

Wait for Vercel deployment ✅

## Step 3: Test

### A. Clear old registrations (optional)
```sql
DELETE FROM mcp_user_registrations WHERE client_id = 'loadedpotat-mcp';
DELETE FROM mcp_oauth_codes WHERE client_id = 'loadedpotat-mcp';
```

### B. Reconnect MCP in Breeze
1. Go to Breeze Agent Studio
2. Remove old MCP connection (if exists)
3. Add new MCP server connection
4. Complete OAuth flow

### C. Check logs (Vercel)

Look for these success messages:

```
✅ OAuth authorization successful: { portal_id: '123456789', ... }
✅ OAuth token exchange successful: { portal_id: '123456789', ... }
🎯 Looking up HubSpot tokens for portal: 123456789
```

### D. Check database

```sql
SELECT 
  hubspot_portal_id,
  scopes,
  created_at
FROM mcp_user_registrations 
WHERE client_id = 'loadedpotat-mcp'
ORDER BY created_at DESC
LIMIT 1;
```

`hubspot_portal_id` should NOT be null! ✅

### E. Test a tool

In Breeze, ask: "Create a contact named Test User"

Should see:
```
✅ MCP request authenticated: { portal_id: '123456789', ... }
🔧 Executing tool: create_contact
✅ Tool executed successfully: create_contact
```

## Troubleshooting

### If portal_id is null in database

**Check authorization URL that HubSpot sent**

It should include one of:
- `?portal_id=123456789`
- `?hubspot_portal_id=123456789`

If not, we may need to:
1. Parse it from the state parameter
2. Add a portal selection UI page
3. Request HubSpot to include it

### If tools fail with "No HubSpot credentials"

**Check app installation:**

```sql
SELECT user_id, app_name, created_at 
FROM app_tokens 
WHERE app_name = 'loadedpotat';
```

The `user_id` (portal ID) should match the `hubspot_portal_id` in `mcp_user_registrations`.

If not → Install the app in the correct portal!

## Files Modified

- ✅ `migrations/add_portal_id_to_mcp_registrations.sql`
- ✅ `api/oauth/types.ts`
- ✅ `api/oauth/authorize.ts`
- ✅ `api/oauth/token.ts`
- ✅ `api/mcp/auth.ts`

## Done! 🎉

If you see portal IDs in logs and database, the fix is working!

---

**Need more details?** See `MCP_PORTAL_TRACKING_FIX.md`

**Want the backstory?** See `MCP_FIX_SUMMARY.md`
