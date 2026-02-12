# MCP Server Setup

Quick setup guide for the Loaded Potat MCP server.

## 1. Database Migration

Run this in Supabase SQL Editor:

```sql
-- MCP OAuth tokens
CREATE TABLE IF NOT EXISTS mcp_user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  client_id TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['crm:read', 'crm:write'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_access_token ON mcp_user_registrations(access_token);

-- Temporary auth codes (5min lifetime)
CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['crm:read', 'crm:write'],
  state TEXT,
  code_challenge TEXT,
  code_challenge_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_expiry ON mcp_oauth_codes(expires_at);
```

## 2. Environment Variables

Add to Vercel:

```bash
VITE_LOADEDPOTAT_MCP_CLIENT_ID=loadedpotat-mcp
LOADEDPOTAT_MCP_CLIENT_SECRET=sT8Bok6dsb3vvNJp6aCoocM81jZ-ynYhvw8mgnPHF3g
```

## 3. Deploy

```bash
git push
```

## 4. Add to App Config

In your HubSpot marketplace app configuration:

```json
{
  "extensions": {
    "mcp": {
      "mcpServers": [{
        "key": "loadedpotat-crm-assistant",
        "authentication": {
          "type": "oauth2",
          "clientId": "loadedpotat-mcp",
          "authorizationUrl": "https://happy-potat-homepage.vercel.app/api/oauth/authorize",
          "tokenUrl": "https://happy-potat-homepage.vercel.app/api/oauth/token"
        },
        "mcpServerUrl": "https://happy-potat-homepage.vercel.app/api/mcp/handler"
      }]
    }
  }
}
```

## 5. Test

1. Install Loaded Potat app in test portal
2. Go to Breeze Agent Studio  
3. Add MCP server tool
4. Complete OAuth flow
5. Test with prompts like "Create a contact named Test User"

## Available Tools

- **Contacts**: create, update, get, search, list_properties
- **Deals**: create, update, get, search, associate_contact_deal

## Endpoints

- `/.well-known/oauth-authorization-server` - OAuth metadata
- `/api/oauth/authorize` - Authorization
- `/api/oauth/token` - Token exchange
- `/api/mcp/handler` - MCP tools
