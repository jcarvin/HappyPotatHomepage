# Vercel Environment Variables Setup

## Problem
The `/api/mcp/handler` endpoint is crashing with `FUNCTION_INVOCATION_FAILED` because required environment variables are missing in the Vercel deployment.

## Root Cause
- Vercel serverless functions (API routes) cannot access `VITE_` prefixed environment variables
- `VITE_` prefix is only for Vite frontend bundling
- `.env` files are NOT deployed to Vercel - variables must be configured in the Vercel dashboard

## Solution

### 1. Add Environment Variables to Vercel

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these variables:

```bash
# Supabase Configuration (REQUIRED for MCP handler)
SUPABASE_URL=https://dwsleozkecmeqeaoowuk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3c2xlb3prZWNtZXFlYW9vd3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUyNTIwMywiZXhwIjoyMDc2MTAxMjAzfQ.ZtsqROWJGL5xiRjST2kTp1zP1zr1BtHr8P7fTF5wdMQ

# API Base URL (REQUIRED for token refresh)
API_BASE_URL=https://happy-potat-homepage.vercel.app

# HubSpot OAuth Credentials (if using OAuth endpoints)
HUBSPOT_CLIENT_ID=28fa7af7-4f36-46c8-87ff-572c0696e8d9
HUBSPOT_CLIENT_SECRET=ef17d109-baa7-4e34-9531-6e3cc9a1a544

# Loaded Potat MCP OAuth Secret (REQUIRED for MCP OAuth)
LOADEDPOTAT_MCP_CLIENT_SECRET=sT8Bok6dsb3vvNJp6aCoocM81jZ-ynYhvw8mgnPHF3g
```

### 2. Set Environment Type

For each variable, set the environment(s) where it should be available:
- ✅ **Production** - for live deployment
- ✅ **Preview** - for branch deployments
- ✅ **Development** - for local `vercel dev`

### 3. Redeploy

After adding the environment variables:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Select **Redeploy**

Or push a new commit to trigger a deployment.

## Code Changes Made

Updated `api/mcp/auth.ts` to prioritize backend environment variables:

```typescript
// Backend environment variables (Vercel serverless functions)
// Note: VITE_ prefixed vars are NOT available in serverless functions
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
```

## Testing

After redeployment, test the endpoint:

```bash
# Health check
curl -X POST https://happy-potat-homepage.vercel.app/api/mcp/handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"ping","params":{},"id":1}'
```

Expected response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "ok",
    "timestamp": "2024-02-12T...",
    "portal_id": "123456"
  },
  "id": 1
}
```

## Environment Variable Naming Convention

| Environment | Variable Prefix | Used By |
|-------------|----------------|---------|
| Frontend (Vite) | `VITE_` | React components |
| Backend (Vercel) | No prefix | API routes |
| Both | Define both versions | Shared config |

## Important Notes

⚠️ **Security**: The `SUPABASE_SERVICE_ROLE_KEY` has full database access. Never expose it to the frontend.

✅ **Best Practice**: Backend API routes should always use non-prefixed environment variables.

🔄 **Local Development**: For local development, you can use `.env` file with both `VITE_` and non-prefixed variables.
