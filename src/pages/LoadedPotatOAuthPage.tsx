/**
 * Loaded Potat App Installation OAuth Page
 * 
 * This page handles the OAuth flow for installing the Loaded Potat app in HubSpot.
 * This is SEPARATE from the MCP OAuth connection that happens in Breeze Studio.
 * 
 * Flow:
 * 1. User authenticates with Supabase
 * 2. User clicks "Install Loaded Potat"
 * 3. Redirects to HubSpot OAuth
 * 4. HubSpot redirects back with authorization code
 * 5. Exchange code for tokens and store in app_tokens table
 */

import { useEffect, useState } from 'react';
import { loginUser, registerUser } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';

const CLIENT_ID = import.meta.env.VITE_LOADEDPOTAT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_LOADEDPOTAT_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_LOADEDPOTAT_REDIRECT_URI;

type Step = 'auth' | 'install' | 'authorizing' | 'success';
type AuthMode = 'login' | 'signup';

// Scopes needed for MCP tools (contacts and deals)
const REQUIRED_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
  'crm.schemas.contacts.read',  // For list_contact_properties tool
  'crm.schemas.deals.read',     // For list_deal_properties tool (if added)
];

function LoadedPotatOAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('auth');

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🥔 Enter the Kitchen');
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [oauthCode, setOauthCode] = useState<string | null>(null);
  const [exchangingToken, setExchangingToken] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    console.log('🥔 Loaded Potat OAuth initialized', {
      hasCode: !!code,
      user: !!user,
      authLoading,
    });

    if (code && user && !exchangingToken) {
      console.log('🔄 Found OAuth code, exchanging for token...');
      setOauthCode(code);
      setStep('authorizing');
      handleTokenExchange(code);
    } else if (user && !code) {
      // User is authenticated but no OAuth code yet
      setStep('install');
    }
  }, [user, authLoading]);

  const handleTokenExchange = async (code: string) => {
    setExchangingToken(true);
    setButtonText('🔄 Exchanging authorization code for tokens...');

    try {
      await exchangeCodeForToken({
        code,
        clientId: CLIENT_ID!,
        clientSecret: CLIENT_SECRET!,
        redirectUri: REDIRECT_URI!,
        appName: 'loadedpotat',
      });

      console.log('✅ Token exchange successful');
      setButtonText('✅ Installation complete!');
      setStep('success');

      // Clean up URL
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);

    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to exchange token');
      setButtonText('❌ Installation failed');
      setButtonDisabled(false);
      setExchangingToken(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setButtonDisabled(true);
    setButtonText('🔄 Processing...');

    try {
      if (authMode === 'signup') {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await registerUser(email, password, username);
        console.log('✅ User registered successfully');
      } else {
        await loginUser(email, password);
        console.log('✅ User logged in successfully');
      }

      // On successful auth, move to install step
      setStep('install');
      setButtonText('🥔 Install Loaded Potat');
      setButtonDisabled(false);
    } catch (error) {
      console.error('❌ Auth error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setButtonText(authMode === 'login' ? '🧀 Enter the Kitchen' : '📝 Create Account');
      setButtonDisabled(false);
    }
  };

  const handleInstallClick = () => {
    if (!user) {
      setAuthError('Please log in first');
      return;
    }

    setButtonDisabled(true);
    setButtonText('🔄 Redirecting to HubSpot...');

    // Build OAuth authorization URL
    const scopes = REQUIRED_SCOPES.join(' ');
    const authUrl = new URL('https://app.hubspotqa.com/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI!);
    authUrl.searchParams.set('scope', scopes);

    console.log('🔗 Redirecting to HubSpot OAuth:', authUrl.toString());

    // Redirect to HubSpot
    window.location.href = authUrl.toString();
  };

  if (authLoading) {
    return (
      <div className="oauth-page">
        <div className="oauth-container">
          <div className="oauth-header">
            <h1>🥔 Loaded Potat</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oauth-page">
      <div className="oauth-container">
        <div className="oauth-header">
          <h1>🥔 Loaded Potat</h1>
          <p className="tagline">MCP-Powered CRM Assistant for HubSpot</p>
        </div>

        {step === 'auth' && (
          <div className="auth-section">
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={authMode === 'signup' ? 'active' : ''}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={buttonDisabled}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={buttonDisabled}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={buttonDisabled}
                />
              </div>
              {authError && <div className="error-message">{authError}</div>}
              <button type="submit" className="action-button" disabled={buttonDisabled}>
                {buttonText}
              </button>
            </form>
          </div>
        )}

        {step === 'install' && (
          <div className="install-section">
            <h2>Install Loaded Potat App</h2>
            <p>
              Click below to install the Loaded Potat app in your HubSpot account.
              This will enable the MCP server to create and update contacts and deals on your behalf.
            </p>

            <div className="scope-info">
              <h3>Required Permissions:</h3>
              <ul>
                <li>✅ Read and write contacts</li>
                <li>✅ Read and write deals</li>
                <li>✅ Read contact & deal properties</li>
              </ul>
            </div>

            {authError && <div className="error-message">{authError}</div>}

            <button
              onClick={handleInstallClick}
              className="action-button install-button"
              disabled={buttonDisabled}
            >
              {buttonText}
            </button>
          </div>
        )}

        {step === 'authorizing' && (
          <div className="authorizing-section">
            <div className="spinner">🔄</div>
            <h2>Installing Loaded Potat...</h2>
            <p>Exchanging authorization code for access tokens...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="success-section">
            <div className="success-icon">✅</div>
            <h2>Installation Complete!</h2>
            <p>Loaded Potat has been installed successfully.</p>

            <div className="next-steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>The app is now connected to your HubSpot account</li>
                <li>Go to Breeze Agent Studio in HubSpot</li>
                <li>Connect the Loaded Potat MCP server (separate OAuth flow)</li>
                <li>Start using MCP tools in your Breeze agents!</li>
              </ol>
            </div>

            <button
              onClick={() => (window.location.href = '/loaded-potat-mcp')}
              className="action-button"
            >
              View MCP Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadedPotatOAuthPage;
