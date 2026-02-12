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

function LoadedPotatOAuthPage() {
  const { user, loading: authLoading } = useAuth();
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
  
  // Update button text when auth mode changes
  useEffect(() => {
    if (!buttonDisabled) {
      setButtonText(authMode === 'login' ? '🥔 Enter the Kitchen' : '🥔 Create Account');
    }
  }, [authMode, buttonDisabled]);

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
    setWelcomeMessage(message);
    setShowWelcome(true);
    setShowForm(false);

    // Add error class temporarily
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
      welcomeEl.classList.add('error');
    }

    setTimeout(() => {
      setShowWelcome(false);
      setShowForm(true);
      if (welcomeEl) {
        welcomeEl.classList.remove('error');
      }
    }, 8000);
  }

  async function handleAuthorizeSubmit(): Promise<void> {
    const returnUrl = getQueryParam('returnUrl');

    if (!returnUrl) {
      showError('🥔 Missing returnUrl! Your potato needs a destination!');
      return;
    }

    setButtonText('🔐 Creating secure state token...');

    // Create state token in database
    const { stateToken, error: stateError } = await createOAuthState(10);

    if (stateError || !stateToken) {
      console.error('❌ Failed to create OAuth state:', stateError);
      showError(`🍠 Failed to create secure state: ${stateError}`);
      return;
    }

    console.log('✅ State token created successfully');

    const loadingMessages = [
      "🥔 Preparing your loaded potato...",
      "🔒 Securing your potato credentials...",
      "🎫 Preparing authorization token...",
      "🧀 Adding extra security cheese..."
    ];
    let messageIndex = 0;

    setButtonText(loadingMessages[0]);

    const loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setButtonText(loadingMessages[messageIndex]);
    }, 800);

    setTimeout(() => {
      clearInterval(loadingInterval);

      console.log('🎫 Authorization successful, redirecting with state:', stateToken.substring(0, 8) + '...');

      const returnUrlObj = new URL(returnUrl);
      returnUrlObj.searchParams.set('state', stateToken);
      window.location.href = returnUrlObj.toString();
    }, 3000);
  }

  async function handleLegacySubmit(): Promise<void> {
    const code = getQueryParam('code');

    // If we have a code, exchange it for a token
    if (code) {
      console.log('🔄 Legacy flow: Found code, exchanging for token');
      const loadingMessages = [
        "🥔 Loading your potato...",
        "🧀 Melting the cheese...",
        "🧈 Adding butter...",
        "☀️ Baking to perfection...",
        "🚜 Serving your loaded potato..."
      ];
      let messageIndex = 0;

      setButtonText(loadingMessages[0]);

      const loadingInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setButtonText(loadingMessages[messageIndex]);
      }, 800);

      setTimeout(() => {
        clearInterval(loadingInterval);
        handleExchangeCodeForToken(code);
      }, 2000);
      return;
    }

    // If no code and we have returnUrl, proceed with authorize flow
    const returnUrl = getQueryParam('returnUrl');
    if (returnUrl) {
      console.log('🚀 Legacy flow: No code, but have returnUrl - proceeding with authorize');
      handleAuthorizeSubmit();
      return;
    }

    // No code and no returnUrl - show error
    console.log('🚨 Legacy flow: No code or returnUrl found');
    showError('🥔 Missing parameters! Please start the installation from the HubSpot Marketplace.');
  }

  async function handleAuth(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError(null);

    // Validate fields based on mode
    if (!email || !password) {
      setAuthError('🥔 Please enter both email and password!');
      return;
    }

    if (authMode === 'signup' && !username) {
      setAuthError('🥔 Please enter a username!');
      return;
    }

    if (password.length < 6) {
      setAuthError('🥔 Password must be at least 6 characters!');
      return;
    }

    setButtonDisabled(true);
    const initialButtonText = authMode === 'login' ? '🔐 Authenticating...' : '🌱 Creating your account...';
    setButtonText(initialButtonText);
    hasProcessedAuth.current = false;

    try {
      if (authMode === 'signup') {
        // Sign up new user
        const { user: newUser, error: signupError } = await registerUser({ email, password, username });

        if (signupError) {
          setAuthError(`🍠 Sign up failed: ${signupError}`);
          setButtonDisabled(false);
          setButtonText('🥔 Create Account');
          return;
        }

        if (!newUser) {
          setAuthError('🥔 Sign up failed. Please try again.');
          setButtonDisabled(false);
          setButtonText('🥔 Create Account');
          return;
        }

        console.log('✅ Sign up successful! Logging in...');
        setButtonText('🔐 Logging you in...');

        // After successful signup, log the user in
        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError || !authUser) {
          setAuthError('🥔 Account created but login failed. Please try logging in.');
          setButtonDisabled(false);
          setButtonText('🥔 Enter the Kitchen');
          setAuthMode('login');
          return;
        }

        console.log('✅ Login successful after signup:', authUser.email);
        setWaitingForAuth(true);
        setButtonText('🌱 Authenticated! Processing...');
      } else {
        // Login existing user
        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError) {
          setAuthError(`🍠 Authentication failed: ${loginError}`);
          setButtonDisabled(false);
          setButtonText('🥔 Enter the Kitchen');
          return;
        }

        if (!authUser) {
          setAuthError('🥔 Authentication failed. Please check your credentials.');
          setButtonDisabled(false);
          setButtonText('🥔 Enter the Kitchen');
          return;
        }

        console.log('✅ Supabase authentication successful for user:', authUser.email);
        setWaitingForAuth(true);
        setButtonText('🌱 Authenticated! Processing...');
      }
      // useEffect will handle the OAuth flow once AuthContext updates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setAuthError(`🍠 Error: ${errorMessage}`);
      setButtonDisabled(false);
      setButtonText(authMode === 'login' ? '🥔 Enter the Kitchen' : '🥔 Create Account');
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
    <>
      <style>{`
        .loaded-potat-page .container {
          background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%) !important;
          border: 3px solid #d63031;
        }
        
        .loaded-potat-title {
          color: #d63031 !important;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .loaded-potat-page .btn {
          background: linear-gradient(135deg, #d63031 0%, #e17055 100%) !important;
          border: none;
        }
        
        .loaded-potat-page .btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #c0392b 0%, #d35400 100%) !important;
          transform: scale(1.02);
        }
        
        .loaded-potat-page .install-info {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
        }
        
        .loaded-potat-page .install-info h3 {
          color: #d63031;
          margin-bottom: 10px;
        }
        
        .loaded-potat-page .potato-divider {
          margin: 20px 0;
          text-align: center;
          font-size: 1.5rem;
          opacity: 0.7;
        }
      `}</style>
      <div className="oauth-page loaded-potat-page">
        <div className="potato-bg">
        <div className="floating-potato" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🥔</div>
        <div className="floating-potato" style={{ top: '20%', right: '15%', animationDelay: '1s' }}>🧀</div>
        <div className="floating-potato" style={{ bottom: '30%', left: '20%', animationDelay: '2s' }}>🥔</div>
        <div className="floating-potato" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }}>🧈</div>
        <div className="floating-potato" style={{ top: '50%', left: '5%', animationDelay: '4s' }}>🥔</div>
        <div className="floating-potato" style={{ top: '60%', right: '5%', animationDelay: '5s' }}>🧀</div>
      </div>

      <div className="container">
        <div className="logo">🥔</div>
        <h1 className="title loaded-potat-title">Loaded Potat</h1>
        <p className="subtitle">MCP-Powered CRM Assistant for HubSpot</p>

        {showForm && (
          <form id="loginForm" onSubmit={handleAuth}>
            {authError && (
              <div className="auth-error">
                {authError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">📧 Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                disabled={buttonDisabled}
              />
            </div>

            {authMode === 'signup' && (
              <div className="form-group">
                <label htmlFor="username">👤 Username:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="potato_chef"
                  autoComplete="username"
                  required
                  disabled={buttonDisabled}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">🔐 Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secret loaded recipe"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                disabled={buttonDisabled}
              />
            </div>

            <div className="potato-divider">🥔 • 🧀 • 🥔</div>

            <button type="submit" className="btn" disabled={buttonDisabled}>
              {buttonText}
            </button>

            <div className="auth-mode-toggle">
              {authMode === 'login' ? (
                <p>
                  New potato chef? {' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setAuthMode('signup');
                      setButtonText('🥔 Create Account');
                      setAuthError(null);
                    }}
                  >
                    Sign up here
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account? {' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setAuthMode('login');
                      setButtonText('🥔 Enter the Kitchen');
                      setAuthError(null);
                      setUsername('');
                    }}
                  >
                    Login here
                  </button>
                </p>
              )}
            </div>

            <div className="install-info">
              <h3>🧀 What's Loaded:</h3>
              <ul>
                <li>✅ Read and write contacts</li>
                <li>✅ Read and write deals</li>
                <li>✅ Read contact & deal properties</li>
                <li>🤖 10 MCP tools for Breeze agents</li>
              </ul>
            </div>
          </form>
        )}

        {showWelcome && (
          <div
            id="welcomeMessage"
            className="welcome-message"
            dangerouslySetInnerHTML={{ __html: welcomeMessage }}
          />
        )}
      </div>
    </div>
    </>
  );
}

export default LoadedPotatOAuthPage;
