# Documentation Index

This file helps you navigate the project documentation.

## 🚀 Quick Start

1. **[README.md](README.md)** - Main project overview
2. **[REFRESH_TOKEN_QUICKSTART.md](REFRESH_TOKEN_QUICKSTART.md)** - Get refresh tokens working (start here!)

## 📚 Setup Guides

### Database & Auth
- **[DATABASE_SETUP.md](DATABASE_SETUP.md)** - Supabase database setup
- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Supabase configuration
- **[AUTH_README.md](AUTH_README.md)** - Authentication setup
- **[VERCEL_ENV_VARS.md](VERCEL_ENV_VARS.md)** - ⚙️ Environment variables configuration

### OAuth
- **[OAUTH_SETUP.md](OAUTH_SETUP.md)** - HubSpot OAuth configuration
- **[OAUTH_STATE_SETUP.md](OAUTH_STATE_SETUP.md)** - OAuth state management
- **[INSTAPOTAT_SETUP.md](INSTAPOTAT_SETUP.md)** - Instagram integration setup

## 🔧 Technical Documentation

### API
- **[API_SETUP.md](API_SETUP.md)** - Vercel serverless API functions
- **[HUBSPOT_DEBUG_PLAYGROUND.md](HUBSPOT_DEBUG_PLAYGROUND.md)** - 🔍 Interactive HubSpot API testing tool

### MCP Server (Loaded Potat)
- **[MCP_SETUP.md](MCP_SETUP.md)** - 🚀 Complete setup guide
- **[MCP_CONSENT_PAGE_FIX.md](MCP_CONSENT_PAGE_FIX.md)** - ✅ **POPUP FIX - READ THIS!**
- **[MCP_DEPLOY_NOW.md](MCP_DEPLOY_NOW.md)** - ⚡ Quick deployment guide for portal tracking fix
- **[MCP_FIX_SUMMARY.md](MCP_FIX_SUMMARY.md)** - 📋 What was broken and how we fixed it
- **[MCP_PORTAL_TRACKING_FIX.md](MCP_PORTAL_TRACKING_FIX.md)** - 📖 Detailed documentation of the portal tracking fix
- **[MCP_OAUTH_DEBUG_GUIDE.md](MCP_OAUTH_DEBUG_GUIDE.md)** - 🔍 Debug OAuth popup/handshake issues
- **[MCP_OAUTH_POTENTIAL_ISSUE.md](MCP_OAUTH_POTENTIAL_ISSUE.md)** - 💡 Missing consent screen analysis

### Refresh Tokens
- **[REFRESH_TOKEN_QUICKSTART.md](REFRESH_TOKEN_QUICKSTART.md)** - Quick start (⭐ READ THIS FIRST)
- **[REFRESH_TOKEN_SETUP.md](REFRESH_TOKEN_SETUP.md)** - Complete technical documentation
- **[REFRESH_TOKEN_SUMMARY.md](REFRESH_TOKEN_SUMMARY.md)** - Overview of implementation

## 🗄️ SQL Migrations

**Important:** Run these in Supabase SQL Editor in this order:

1. **[ADD_REFRESH_TOKEN_MIGRATION.sql](ADD_REFRESH_TOKEN_MIGRATION.sql)** - Adds refresh_token columns
2. **[UPDATE_UPSERT_FUNCTION.sql](UPDATE_UPSERT_FUNCTION.sql)** - Updates database function
3. **[FIX_RLS_FOR_OAUTH.sql](FIX_RLS_FOR_OAUTH.sql)** - Fixes RLS policies (if needed)

## 🎯 Common Tasks

### Setting up refresh tokens
→ See **[REFRESH_TOKEN_QUICKSTART.md](REFRESH_TOKEN_QUICKSTART.md)**

### Adding new API endpoints
→ See **[API_SETUP.md](API_SETUP.md)**

### Troubleshooting OAuth
→ See **[OAUTH_STATE_SETUP.md](OAUTH_STATE_SETUP.md)**

### Database issues
→ See **[DATABASE_SETUP.md](DATABASE_SETUP.md)**

---

**Last Updated:** October 17, 2025

