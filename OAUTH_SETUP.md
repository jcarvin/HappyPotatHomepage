# OAuth Page Setup

This document explains how to use the HappyPotato OAuth page for handling HubSpot OAuth connections.

## Configuration

The OAuth page requires the following environment variables in your `.env` file:

```env
VITE_HUBSPOT_CLIENT_ID=your_client_id_here
VITE_HUBSPOT_CLIENT_SECRET=your_client_secret_here
VITE_HUBSPOT_REDIRECT_URI=your_redirect_uri_here
```

See `.env.example` for a template.

## Routes

The OAuth page uses a single route (`/oauth`) with different behaviors controlled by the `step` query parameter:

### 1. Legacy Step (`?step=legacy`)
Legacy flow for backward compatibility. Shows the login form and waits for authorization code.

**Query Parameters:**
- `step=legacy` (required): Indicates legacy flow
- `returnUrl` (required): URL to redirect to after successful authentication
- `code` (optional): Authorization code from OAuth provider

**Example:**
```
https://yourdomain.com/oauth?step=legacy&returnUrl=https://app.example.com/callback
```

### 2. Authorize Step (`?step=authorize`)
Authorization flow with state parameter for CSRF protection.

**Query Parameters:**
- `step=authorize` (required): Indicates authorization flow
- `returnUrl` (required): URL to redirect to after successful authentication

**Features:**
- Generates cryptographically secure state parameter
- Optional cookie storage for state validation (user can toggle)
- Optional redirect after install (user can toggle)

**Example:**
```
https://yourdomain.com/oauth?step=authorize&returnUrl=https://app.example.com/callback
```

**Flow:**
1. User fills out login form
2. State parameter is generated and optionally stored in cookies
3. User is redirected to `returnUrl` with state parameter appended

### 3. Finalize Step (`?step=finalize`)
Finalization step that validates state and completes the OAuth installation.

**Query Parameters:**
- `step=finalize` (required): Indicates finalization flow
- `code` (required): Authorization code from OAuth provider
- `state` (required): State parameter for CSRF validation
- `returnUrl` (required): URL to redirect to after successful authentication

**Security Features:**
- Validates state parameter against stored cookie value
- Prevents CSRF attacks
- Auto-expires state cookies after 10 minutes

**Example:**
```
https://yourdomain.com/oauth?step=finalize&code=abc123&state=xyz789&returnUrl=https://app.example.com/callback
```

### 4. Default (no step parameter)
If no `step` parameter is provided, defaults to legacy flow.

## OAuth Flow

### Standard Flow (with state validation)

1. **Authorization Request** (`/oauth?step=authorize`)
   - User visits authorization page
   - Fills out login form
   - State parameter is generated and stored in cookies
   - Redirected to returnUrl with state parameter

2. **OAuth Provider** (External)
   - User authenticates with OAuth provider
   - Provider redirects back with authorization code

3. **Finalization** (`/oauth?step=finalize`)
   - Validates state parameter
   - Exchanges code for access token
   - Fetches account info
   - Displays welcome message
   - Redirects to returnUrl

### Legacy Flow

1. **Legacy Request** (`/oauth?step=legacy`)
   - User visits page with authorization code
   - Code is immediately exchanged for token
   - No state validation (less secure)

## API Endpoints

The OAuth page communicates with the following Cloud Function endpoints:

### Exchange Code for Token
```
POST https://us-central1-hubspot-oauth-proxy.cloudfunctions.net/exchange_code

Request Body:
{
  "code": "authorization_code",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "redirect_uri": "your_redirect_uri"
}

Response:
{
  "access_token": "token_here",
  "refresh_token": "refresh_token_here",
  "expires_in": 3600
}
```

### Get Account Info
```
POST https://us-central1-hubspot-oauth-proxy.cloudfunctions.net/get_account_info

Request Body:
{
  "access_token": "your_access_token"
}

Response:
{
  "portalId": "12345678",
  ...other account details
}
```

## Cookie Management

The OAuth page uses the following cookies:

- **`oauth_state`**: Stores the state parameter for CSRF validation
  - Expires: 10 minutes
  - SameSite: None
  - Secure: true

- **`redirect_after_install`**: Stores user preference for redirect behavior
  - Expires: 30 minutes
  - SameSite: None
  - Secure: true

## Error Handling

The page handles various error scenarios:

- Missing authorization code
- Missing or invalid state parameter
- State mismatch (CSRF detection)
- Token exchange failures
- Missing portal ID in response

All errors are displayed with potato-themed messages and appropriate visual feedback.

## Local Storage

The access token is stored in localStorage after successful authentication:

```javascript
localStorage.setItem('access_token', token);
```

## User Experience Features

- **Potato-themed UI**: Fun, engaging interface with potato emojis and animations
- **Loading States**: Animated button text during processing
- **Countdown Timer**: 3-second countdown before redirect
- **Floating Background**: Animated potato decorations
- **Responsive Design**: Mobile-friendly layout
- **Toggle Options**: User can control state saving and redirect behavior

## Security Considerations

1. **State Parameter**: Cryptographically secure random 64-character hex string
2. **CSRF Protection**: State validation prevents cross-site request forgery
3. **Cookie Security**: SameSite=None and Secure flags
4. **Short Expiry**: State cookies expire after 10 minutes
5. **Clean-up**: Cookies are deleted after use

## Development

To test the OAuth flow locally:

1. Set up your environment variables in `.env`
2. Start the development server: `npm run dev`
3. Navigate to `/oauth` with appropriate query parameters:
   - `/oauth?step=authorize&returnUrl=https://example.com`
   - `/oauth?step=finalize&code=abc123&state=xyz789&returnUrl=https://example.com`
   - `/oauth?step=legacy&returnUrl=https://example.com`
4. Use browser DevTools to inspect cookies and network requests

## Troubleshooting

### "Missing state parameter" error
- Check if cookies are enabled in your browser
- Ensure your site is served over HTTPS (required for Secure cookies)

### "State mismatch detected" error
- Cookie may have expired (10-minute limit)
- CSRF attack detected
- Clear cookies and try again

### "Missing returnUrl" error
- Ensure the `returnUrl` query parameter is included in the URL
- Check URL encoding of the returnUrl value

### Token exchange fails
- Verify CLIENT_ID and CLIENT_SECRET in .env
- Check REDIRECT_URI matches OAuth provider settings
- Review network tab for error responses

