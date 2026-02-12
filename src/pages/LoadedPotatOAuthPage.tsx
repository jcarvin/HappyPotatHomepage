/**
 * Loaded Potat App Installation OAuth Page
 * 
 * This page handles the OAuth flow for installing the Loaded Potat app in HubSpot.
 * This is SEPARATE from the MCP OAuth connection that happens in Breeze Studio.
 * 
 * Flow:
 * 1. step=authorize: User authenticates with Supabase
 * 2. After auth: Redirects to HubSpot OAuth with state
 * 3. step=finalize: HubSpot redirects back with code and state
 * 4. Validates state, exchanges code for tokens, stores in app_tokens
 */

import { useEffect, useState, useRef } from 'react';
import { loginUser, registerUser, createOAuthState, consumeOAuthState } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';
import './OAuthPage.css';

const CLIENT_ID = import.meta.env.VITE_LOADEDPOTAT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_LOADEDPOTAT_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_LOADEDPOTAT_REDIRECT_URI;

type OAuthStep = 'authorize' | 'finalize' | 'legacy';
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
  const [currentStep, setCurrentStep] = useState<OAuthStep>('legacy');
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const hasProcessedAuth = useRef(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🥔 Enter the Kitchen');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Display state
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  // Handle auth state changes - proceed with OAuth flow once authenticated
  useEffect(() => {
    if (user && !authLoading && waitingForAuth && !hasProcessedAuth.current) {
      hasProcessedAuth.current = true;

      const step = getQueryParam('step');

      if (step === 'authorize') {
        handleAuthorizeSubmit();
      } else {
        handleLegacySubmit();
      }
    }
  }, [user, authLoading, waitingForAuth]);

  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }

  function initializeApp(): void {
    const step = getQueryParam('step') as OAuthStep | null;
    const code = getQueryParam('code');
    const state = getQueryParam('state');

    console.log('🥔 Initializing Loaded Potat with step:', step);

    const currentStepValue = step || 'legacy';
    setCurrentStep(currentStepValue);

    switch (currentStepValue) {
      case 'authorize':
        showAuthorizeForm();
        break;

      case 'finalize':
        handleFinalizeStep(code, state);
        break;

      case 'legacy':
      default:
        handleLegacyFlow();
        break;
    }
  }

  function showAuthorizeForm(): void {
    console.log('🥔 Ready for authorization step - potato login!');
  }

  function handleLegacyFlow(): void {
    console.log('🥔 Legacy flow: Showing login form');
    showAuthorizeForm();
  }

  async function handleFinalizeStep(code: string | null, state: string | null): Promise<void> {
    console.log('🥔 Finalize step: Validating state and completing installation');

    if (!code) {
      console.log('🚨 Finalize Error: Missing authorization code');
      showError('🚨 Finalize Error: Missing authorization code. Your potato got lost in transit!');
      return;
    }

    if (!state) {
      console.log('🚨 Security Error: Missing state parameter');
      showError('🚨 Security Error: Missing state parameter. Your potato might be compromised!');
      return;
    }

    // Consume the state token and get the associated user ID
    console.log('🔍 Validating state token from database...');
    const { userId, error: stateError } = await consumeOAuthState(state);

    if (stateError || !userId) {
      console.log('🚨 Security Error:', stateError || 'Invalid state token');
      showError(`🚨 Security Error: ${stateError || 'Invalid state token'}. Your potato session might be expired or compromised! 🛡️`);
      return;
    }

    console.log('✅ State validation successful - proceeding with installation for user:', userId);

    // Exchange code for token and associate with the user
    handleExchangeCodeForToken(code, userId);
  }

  async function handleExchangeCodeForToken(code: string, userId?: string): Promise<void> {
    setButtonText('🔄 Validating your potato credentials...');
    setShowWelcome(true);
    setShowForm(false);
    setWelcomeMessage('🔄 Validating your potato credentials...');

    try {
      const result = await exchangeCodeForToken({
        code,
        appName: 'loadedpotat',
        clientId: CLIENT_ID!,
        clientSecret: CLIENT_SECRET!,
        redirectUri: REDIRECT_URI!,
        userId,
      });

      console.log('✅ Token exchange successful:', result);
      displaySuccessMessage(result.portalId || 'Unknown');

    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      showError(`🚨 Installation Error: ${error instanceof Error ? error.message : 'Failed to exchange token'}`);
    }
  }

  function displaySuccessMessage(portalId: string): void {
    setShowForm(false);
    setWelcomeMessage(`🎉 Welcome to Loaded Potat, Portal ${portalId}!<br>✅ Installation successful!<br><br>Next: Connect MCP in Breeze Studio`);
    setShowWelcome(true);
  }

  function showError(message: string): void {
    setShowForm(false);
    setShowWelcome(true);
    setWelcomeMessage(message);
  }

  async function handleAuthorizeSubmit(): Promise<void> {
    if (!user) {
      console.log('🚨 No user found after authentication');
      return;
    }

    console.log('🥔 User authenticated, creating OAuth state...');

    // Create and store OAuth state
    const { state, error: stateError } = await createOAuthState(user.id);

    if (stateError || !state) {
      console.error('🚨 Failed to create OAuth state:', stateError);
      showError('🚨 Failed to create OAuth state. Please try again.');
      return;
    }

    console.log('✅ OAuth state created:', state);

    // Build HubSpot OAuth URL
    const scopes = REQUIRED_SCOPES.join(' ');
    const authUrl = new URL('https://app.hubspotqa.com/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', `${REDIRECT_URI}?step=finalize`);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    console.log('🔗 Redirecting to HubSpot OAuth:', authUrl.toString());

    // Redirect to HubSpot
    window.location.href = authUrl.toString();
  }

  async function handleLegacySubmit(): Promise<void> {
    // For legacy flow, just do the same as authorize
    handleAuthorizeSubmit();
  }

  async function handleAuth(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError(null);
    setButtonDisabled(true);
    setButtonText('🔄 Processing...');
    setWaitingForAuth(true);

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
    } catch (error) {
      console.error('❌ Auth error:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setButtonText(authMode === 'login' ? '🥔 Enter the Kitchen' : '📝 Create Account');
      setButtonDisabled(false);
      setWaitingForAuth(false);
    }
  }

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

        {showWelcome && (
          <div className="welcome-section">
            <div
              className="welcome-message"
              dangerouslySetInnerHTML={{ __html: welcomeMessage }}
            />
            <button
              onClick={() => (window.location.href = '/loaded-potat-mcp')}
              className="action-button"
            >
              View MCP Dashboard →
            </button>
          </div>
        )}

        {showForm && !user && (
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

            <div className="install-info">
              <h3>What you'll get:</h3>
              <ul>
                <li>✅ Read and write contacts</li>
                <li>✅ Read and write deals</li>
                <li>✅ Read contact & deal properties</li>
                <li>🤖 10 MCP tools for Breeze agents</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadedPotatOAuthPage;
