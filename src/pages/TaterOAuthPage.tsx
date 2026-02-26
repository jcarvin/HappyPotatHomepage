/**
 * Tater App Installation OAuth Page
 *
 * This page handles the OAuth flow for installing the Tater app in HubSpot.
 * This is SEPARATE from the MCP OAuth connection that happens in Breeze Studio.
 *
 * Flow:
 * 1. step=authorize: User authenticates with Supabase
 * 2. After auth: Redirects to HubSpot OAuth with state
 * 3. step=finalize: HubSpot redirects back with code and state
 * 4. Validates state, exchanges code for tokens, stores in app_tokens
 */

import { useEffect, useState, useRef } from 'react';
import { loginUser, registerUser, createOAuthState, consumeOAuthState, generateCodeVerifier, generateCodeChallenge } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';
import './OAuthPage.css';

const CLIENT_ID = import.meta.env.VITE_TATER_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_TATER_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_TATER_REDIRECT_URI;

type OAuthStep = 'authorize' | 'finalize' | 'legacy';
type AuthMode = 'login' | 'signup';

function TaterOAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const hasProcessedAuth = useRef(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🍟 Drop Into the Fryer');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Display state
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showForm, setShowForm] = useState(true);

  // Update button text when auth mode changes
  useEffect(() => {
    if (!buttonDisabled) {
      setButtonText(authMode === 'login' ? '🍟 Drop Into the Fryer' : '🍟 Create Account');
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

    console.log('🍟 Initializing Tater with step:', step);

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
    console.log('🍟 Ready for authorization step - tater login!');
  }

  function handleLegacyFlow(): void {
    console.log('🍟 Legacy flow: Showing login form');
    showAuthorizeForm();
  }

  async function handleFinalizeStep(code: string | null, state: string | null): Promise<void> {
    console.log('🍟 Finalize step: Validating state and completing installation');

    if (!code) {
      console.log('🚨 Finalize Error: Missing authorization code');
      showError('🚨 Finalize Error: Missing authorization code. Your tater got lost in the fryer!');
      return;
    }

    if (!state) {
      console.log('🚨 Security Error: Missing state parameter');
      showError('🚨 Security Error: Missing state parameter. Your tater might be compromised!');
      return;
    }

    console.log('🔍 Validating state token from database...');
    const { userId, codeVerifier, error: stateError } = await consumeOAuthState(state);

    if (stateError || !userId) {
      console.log('🚨 Security Error:', stateError || 'Invalid state token');
      showError(`🚨 Security Error: ${stateError || 'Invalid state token'}. Your tater session might be expired or compromised! 🛡️`);
      return;
    }

    console.log('✅ State validation successful - proceeding with installation for user:', userId);
    console.log('🔑 [PKCE] Code verifier from database:', codeVerifier ? '✅ present' : '❌ NOT FOUND - was it saved during authorize step?');
    console.log('🔑 [PKCE] Code verifier value (finalize):', codeVerifier ?? 'null');

    if (codeVerifier) {
      const recomputedChallenge = await generateCodeChallenge(codeVerifier);
      console.log('🔑 [PKCE] Recomputed challenge from retrieved verifier:', recomputedChallenge);
      console.log('🔑 [PKCE] If the above matches the challenge logged at authorize time, the data is correct and the proxy is dropping code_verifier before sending to HubSpot.');
    }

    handleExchangeCodeForToken(code, userId, codeVerifier ?? undefined);
  }

  async function handleExchangeCodeForToken(code: string, userId?: string, codeVerifier?: string): Promise<void> {
    setButtonText('🔄 Validating your tater credentials...');
    setShowWelcome(true);
    setShowForm(false);
    setWelcomeMessage('🔄 Validating your tater credentials...');

    console.log('🔑 [PKCE] Token exchange - codeVerifier:', codeVerifier ? '✅ present' : '❌ absent');

    try {
      const result = await exchangeCodeForToken({
        code,
        appName: 'tater',
        clientId: CLIENT_ID!,
        clientSecret: CLIENT_SECRET!,
        redirectUri: REDIRECT_URI!,
        userId,
        codeVerifier,
      });

      console.log('✅ Token exchange completed:', result);
      displaySuccessMessage(result.portalId || 'Unknown');

    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      showError(`🚨 Installation Error: ${error instanceof Error ? error.message : 'Failed to exchange token'}`);
    }
  }

  function displaySuccessMessage(portalId: string): void {
    setShowForm(false);
    setWelcomeMessage(`🎉 Welcome to Tater, Portal ${portalId}!<br>✅ Installation successful!<br><br>Next: Connect MCP in Breeze Studio`);
    setShowWelcome(true);
  }

  function showError(message: string): void {
    setWelcomeMessage(message);
    setShowWelcome(true);
    setShowForm(false);

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
      showError('🍟 Missing returnUrl! Your tater needs a destination!');
      return;
    }

    setButtonText('🔐 Creating secure state token...');

    const codeVerifier = generateCodeVerifier();
    console.log('🔑 [PKCE] Code verifier generated:', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    console.log('🔑 [PKCE] Code verifier generated (authorize):', codeVerifier);
    console.log('🔑 [PKCE] Code challenge (S256):', codeChallenge);

    const { stateToken, error: stateError } = await createOAuthState(10, codeVerifier);

    if (stateError || !stateToken) {
      console.error('❌ Failed to create OAuth state:', stateError);
      showError(`🍟 Failed to create secure state: ${stateError}`);
      return;
    }
    console.log('🔑 [PKCE] Code verifier saved to database alongside state token');

    console.log('✅ State token created successfully');

    const loadingMessages = [
      '🍟 Preheating the fryer...',
      '🔒 Securing your tater credentials...',
      '🎫 Preparing authorization token...',
      '🧂 Adding extra security seasoning...',
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
      returnUrlObj.searchParams.set('code_challenge', codeChallenge);
      returnUrlObj.searchParams.set('code_challenge_method', 'S256');
      const finalRedirectUrl = returnUrlObj.toString();
      console.log('🔑 [PKCE] Full redirect URL being sent to HubSpot:', finalRedirectUrl);
      console.log('🔑 [PKCE] code_challenge in redirect URL:', returnUrlObj.searchParams.get('code_challenge'));
      window.location.href = finalRedirectUrl;
    }, 3000);
  }

  async function handleLegacySubmit(): Promise<void> {
    const code = getQueryParam('code');

    if (code) {
      console.log('🔄 Legacy flow: Found code, exchanging for token');
      const loadingMessages = [
        '🍟 Dropping taters in the fryer...',
        '🔥 Getting crispy...',
        '🧂 Adding seasoning...',
        '⏱️ Almost golden...',
        '🚜 Serving your taters...',
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

    const returnUrl = getQueryParam('returnUrl');
    if (returnUrl) {
      console.log('🚀 Legacy flow: No code, but have returnUrl - proceeding with authorize');
      handleAuthorizeSubmit();
      return;
    }

    console.log('🚨 Legacy flow: No code or returnUrl found');
    showError('🍟 Missing parameters! Please start the installation from the HubSpot Marketplace.');
  }

  async function handleAuth(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('🍟 Please enter both email and password!');
      return;
    }

    if (authMode === 'signup' && !username) {
      setAuthError('🍟 Please enter a username!');
      return;
    }

    if (password.length < 6) {
      setAuthError('🍟 Password must be at least 6 characters!');
      return;
    }

    setButtonDisabled(true);
    const initialButtonText = authMode === 'login' ? '🔐 Authenticating...' : '🌱 Creating your account...';
    setButtonText(initialButtonText);
    hasProcessedAuth.current = false;

    try {
      if (authMode === 'signup') {
        const { user: newUser, error: signupError } = await registerUser({ email, password, username });

        if (signupError) {
          setAuthError(`🍟 Sign up failed: ${signupError}`);
          setButtonDisabled(false);
          setButtonText('🍟 Create Account');
          return;
        }

        if (!newUser) {
          setAuthError('🍟 Sign up failed. Please try again.');
          setButtonDisabled(false);
          setButtonText('🍟 Create Account');
          return;
        }

        console.log('✅ Sign up successful! Logging in...');
        setButtonText('🔐 Logging you in...');

        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError || !authUser) {
          setAuthError('🍟 Account created but login failed. Please try logging in.');
          setButtonDisabled(false);
          setButtonText('🍟 Drop Into the Fryer');
          setAuthMode('login');
          return;
        }

        console.log('✅ Login successful after signup:', authUser.email);
        setWaitingForAuth(true);
        setButtonText('🌱 Authenticated! Processing...');
      } else {
        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError) {
          setAuthError(`🍟 Authentication failed: ${loginError}`);
          setButtonDisabled(false);
          setButtonText('🍟 Drop Into the Fryer');
          return;
        }

        if (!authUser) {
          setAuthError('🍟 Authentication failed. Please check your credentials.');
          setButtonDisabled(false);
          setButtonText('🍟 Drop Into the Fryer');
          return;
        }

        console.log('✅ Supabase authentication successful for user:', authUser.email);
        setWaitingForAuth(true);
        setButtonText('🌱 Authenticated! Processing...');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setAuthError(`🍟 Error: ${errorMessage}`);
      setButtonDisabled(false);
      setButtonText(authMode === 'login' ? '🍟 Drop Into the Fryer' : '🍟 Create Account');
    }
  }

  if (authLoading) {
    return (
      <div className="oauth-page">
        <div className="oauth-container">
          <div className="oauth-header">
            <h1>🍟 Tater</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .tater-page .container {
          background: linear-gradient(135deg, #ffeaa7 0%, #f9ca24 50%, #f0932b 100%) !important;
          border: 3px solid #b7410e;
        }

        .tater-title {
          color: #b7410e !important;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          letter-spacing: 2px;
        }

        .tater-page .btn {
          background: linear-gradient(135deg, #b7410e 0%, #f0932b 100%) !important;
          border: none;
        }

        .tater-page .btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #922b0c 0%, #d4830e 100%) !important;
          transform: scale(1.02);
        }

        .tater-page .install-info {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
        }

        .tater-page .install-info h3 {
          color: #b7410e;
          margin-bottom: 10px;
        }

        .tater-page .potato-divider {
          margin: 20px 0;
          text-align: center;
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .tater-page .link-btn {
          color: #b7410e !important;
        }

        .tater-page .link-btn:hover {
          color: #922b0c !important;
        }
      `}</style>
      <div className="oauth-page tater-page">
        <div className="potato-bg">
          <div className="floating-potato" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🍟</div>
          <div className="floating-potato" style={{ top: '20%', right: '15%', animationDelay: '1s' }}>🥔</div>
          <div className="floating-potato" style={{ bottom: '30%', left: '20%', animationDelay: '2s' }}>🍟</div>
          <div className="floating-potato" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }}>🧂</div>
          <div className="floating-potato" style={{ top: '50%', left: '5%', animationDelay: '4s' }}>🍟</div>
          <div className="floating-potato" style={{ top: '60%', right: '5%', animationDelay: '5s' }}>🥔</div>
        </div>

        <div className="container">
          <div className="logo">🍟</div>
          <h1 className="title tater-title">Tater</h1>
          <p className="subtitle">Crispy CRM tools for HubSpot</p>

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
                    placeholder="tater_chef"
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
                  placeholder="Your secret crispy recipe"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  disabled={buttonDisabled}
                />
              </div>

              <div className="potato-divider">🍟 • 🧂 • 🍟</div>

              <button type="submit" className="btn" disabled={buttonDisabled}>
                {buttonText}
              </button>

              <div className="auth-mode-toggle">
                {authMode === 'login' ? (
                  <p>
                    New tater chef?{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setAuthMode('signup');
                        setButtonText('🍟 Create Account');
                        setAuthError(null);
                      }}
                    >
                      Sign up here
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setAuthMode('login');
                        setButtonText('🍟 Drop Into the Fryer');
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
                <h3>🧂 What's Crispy:</h3>
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

export default TaterOAuthPage;
