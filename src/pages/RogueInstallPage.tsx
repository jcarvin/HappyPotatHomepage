/**
 * Rogue Install Page
 *
 * Mirrors the Tater OAuth flow but redirects to a hardcoded HubSpot QA OAuth URL
 * after sign-in, with redirect_uri overridden to point back here for token exchange.
 *
 * Flow:
 * 1. (no step): User authenticates with Supabase
 * 2. After auth: Creates state token, redirects to HubSpot QA OAuth authorize URL
 * 3. step=finalize: HubSpot redirects back with code + state; validates state, exchanges code for tokens
 */

import { useEffect, useState, useRef } from 'react';
import { loginUser, registerUser, createOAuthState, consumeOAuthState } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';
import './OAuthPage.css';

const ROGUE_CLIENT_ID = '28fa7af7-4f36-46c8-87ff-572c0696e8d9';
const ROGUE_SCOPES = 'settings.users.read oauth crm.objects.contacts.read';
const ROGUE_HS_AUTHORIZE_URL = 'https://app.hubspotqa.com/oauth/authorize';

const CLIENT_SECRET = import.meta.env.VITE_HUBSPOT_CLIENT_SECRET;

const ROGUE_INSTALL_REDIRECT_FLAG = 'rogueInstall_shouldRedirect';
const ROGUE_INSTALL_RETURN_URL = 'rogueInstall_returnUrl';

function clearRogueInstallRedirectStorage(): void {
  sessionStorage.removeItem(ROGUE_INSTALL_REDIRECT_FLAG);
  sessionStorage.removeItem(ROGUE_INSTALL_RETURN_URL);
}

function getRogueRedirectUri(): string {
  return `${window.location.origin}/rogue-install?step=finalize`;
}

type OAuthStep = 'authorize' | 'finalize';
type AuthMode = 'login' | 'signup';

function RogueInstallPage() {
  const { user, loading: authLoading } = useAuth();
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const hasProcessedAuth = useRef(false);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🔓 Begin Rogue Install');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [redirectAfterHubSpot, setRedirectAfterHubSpot] = useState(false);

  useEffect(() => {
    if (!buttonDisabled) {
      setButtonText(authMode === 'login' ? '🔓 Begin Rogue Install' : '🌱 Create Account');
    }
  }, [authMode, buttonDisabled]);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (user && !authLoading && waitingForAuth && !hasProcessedAuth.current) {
      hasProcessedAuth.current = true;
      handleAuthorizeSubmit();
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

    if (step === 'finalize') {
      handleFinalizeStep(code, state);
    }
  }

  async function handleFinalizeStep(code: string | null, state: string | null): Promise<void> {
    if (!code) {
      showError('🚨 Missing authorization code. The rogue install lost its code in transit!');
      return;
    }

    if (!state) {
      showError('🚨 Missing state parameter. The rogue install has been compromised!');
      return;
    }

    const { userId, error: stateError } = await consumeOAuthState(state);

    if (stateError || !userId) {
      showError(`🚨 State validation failed: ${stateError || 'Invalid state token'}. Session may be expired.`);
      return;
    }

    await handleExchangeCodeForToken(code, userId);
  }

  async function handleExchangeCodeForToken(code: string, userId?: string): Promise<void> {
    setShowWelcome(true);
    setShowForm(false);
    setWelcomeMessage('🔄 Exchanging authorization code for tokens...');

    try {
      const result = await exchangeCodeForToken({
        code,
        appName: 'tater',
        clientId: ROGUE_CLIENT_ID,
        clientSecret: CLIENT_SECRET!,
        redirectUri: getRogueRedirectUri(),
        userId,
      });

      if (!result.success) {
        clearRogueInstallRedirectStorage();
        showError(`🚨 Token exchange failed: ${result.error}`);
        return;
      }

      setShowForm(false);
      const successHtml = `🎉 Rogue install complete! Portal ${result.portalId || 'Unknown'}<br>✅ Tokens stored under the Tater app.`;
      setWelcomeMessage(successHtml);
      setShowWelcome(true);

      const shouldRedirect = sessionStorage.getItem(ROGUE_INSTALL_REDIRECT_FLAG) === 'true';
      const storedReturnUrl = sessionStorage.getItem(ROGUE_INSTALL_RETURN_URL);
      if (shouldRedirect && storedReturnUrl) {
        try {
          new URL(storedReturnUrl);
          clearRogueInstallRedirectStorage();
          setWelcomeMessage(`${successHtml}<br>🚀 Redirecting back to HubSpot…`);
          setTimeout(() => {
            window.location.href = storedReturnUrl;
          }, 1000);
          return;
        } catch {
          clearRogueInstallRedirectStorage();
        }
      } else {
        clearRogueInstallRedirectStorage();
      }
    } catch (error) {
      clearRogueInstallRedirectStorage();
      showError(`🚨 Token exchange error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleAuthorizeSubmit(): Promise<void> {
    if (!redirectAfterHubSpot) {
      clearRogueInstallRedirectStorage();
    } else {
      const returnUrl = getQueryParam('returnUrl');
      if (!returnUrl) {
        hasProcessedAuth.current = false;
        setWaitingForAuth(false);
        setButtonDisabled(false);
        setButtonText(authMode === 'login' ? '🔓 Begin Rogue Install' : '🌱 Create Account');
        showError(
          '🚨 Missing returnUrl. Add returnUrl to the page URL when redirect-after-install is enabled.'
        );
        return;
      }
      try {
        new URL(returnUrl);
      } catch {
        hasProcessedAuth.current = false;
        setWaitingForAuth(false);
        setButtonDisabled(false);
        setButtonText(authMode === 'login' ? '🔓 Begin Rogue Install' : '🌱 Create Account');
        showError('🚨 Invalid returnUrl query parameter.');
        return;
      }
      sessionStorage.setItem(ROGUE_INSTALL_REDIRECT_FLAG, 'true');
      sessionStorage.setItem(ROGUE_INSTALL_RETURN_URL, returnUrl);
    }

    setButtonText('🔐 Creating secure state token...');

    const { stateToken, error: stateError } = await createOAuthState(10);

    if (stateError || !stateToken) {
      clearRogueInstallRedirectStorage();
      hasProcessedAuth.current = false;
      setWaitingForAuth(false);
      setButtonDisabled(false);
      setButtonText(authMode === 'login' ? '🔓 Begin Rogue Install' : '🌱 Create Account');
      showError(`🚨 Failed to create state token: ${stateError}`);
      return;
    }

    const loadingMessages = [
      '🔒 Securing rogue credentials...',
      '🎫 Preparing authorization token...',
      '🧂 Adding security seasoning...',
      '🚀 Launching rogue install...',
    ];
    let messageIndex = 0;
    setButtonText(loadingMessages[0]);

    const loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setButtonText(loadingMessages[messageIndex]);
    }, 800);

    setTimeout(() => {
      clearInterval(loadingInterval);

      const authUrl = new URL(ROGUE_HS_AUTHORIZE_URL);
      authUrl.searchParams.set('client_id', ROGUE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', getRogueRedirectUri());
      authUrl.searchParams.set('scope', ROGUE_SCOPES);
      authUrl.searchParams.set('state', stateToken);

      window.location.href = authUrl.toString();
    }, 3000);
  }

  async function handleAuth(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup' && !username) {
      setAuthError('Please enter a username.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setButtonDisabled(true);
    setButtonText(authMode === 'login' ? '🔐 Authenticating...' : '🌱 Creating account...');
    hasProcessedAuth.current = false;

    try {
      if (authMode === 'signup') {
        const { user: newUser, error: signupError } = await registerUser({ email, password, username });

        if (signupError || !newUser) {
          setAuthError(`Sign up failed: ${signupError || 'Unknown error'}`);
          setButtonDisabled(false);
          setButtonText('🌱 Create Account');
          return;
        }

        setButtonText('🔐 Logging you in...');

        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError || !authUser) {
          setAuthError('Account created but login failed. Please try logging in.');
          setButtonDisabled(false);
          setButtonText('🔓 Begin Rogue Install');
          setAuthMode('login');
          return;
        }

        setWaitingForAuth(true);
        setButtonText('✅ Authenticated! Preparing redirect...');
      } else {
        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError || !authUser) {
          setAuthError(`Authentication failed: ${loginError || 'Invalid credentials'}`);
          setButtonDisabled(false);
          setButtonText('🔓 Begin Rogue Install');
          return;
        }

        setWaitingForAuth(true);
        setButtonText('✅ Authenticated! Preparing redirect...');
      }
    } catch (err) {
      setAuthError(`Error: ${err instanceof Error ? err.message : 'An error occurred'}`);
      setButtonDisabled(false);
      setButtonText(authMode === 'login' ? '🔓 Begin Rogue Install' : '🌱 Create Account');
    }
  }

  function showError(message: string): void {
    setWelcomeMessage(message);
    setShowWelcome(true);
    setShowForm(false);

    const welcomeEl = document.getElementById('rogueWelcomeMessage');
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

  if (authLoading) {
    return (
      <div className="oauth-page">
        <div className="oauth-container">
          <div className="oauth-header">
            <h1>🕵️ Rogue Install</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .rogue-page .container {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
          border: 3px solid #e94560;
        }

        .rogue-title {
          color: #e94560 !important;
          text-shadow: 2px 2px 8px rgba(233, 69, 96, 0.5);
          letter-spacing: 3px;
        }

        .rogue-page .subtitle {
          color: #a8b2d8 !important;
        }

        .rogue-page label {
          color: #a8b2d8 !important;
        }

        .rogue-page input {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid #e94560 !important;
          color: #e6f1ff !important;
        }

        .rogue-page input::placeholder {
          color: #6b7280 !important;
        }

        .rogue-page .btn {
          background: linear-gradient(135deg, #e94560 0%, #c62a47 100%) !important;
          border: none;
        }

        .rogue-page .btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #c62a47 0%, #a01e35 100%) !important;
          transform: scale(1.02);
        }

        .rogue-page .install-info {
          background: rgba(233, 69, 96, 0.1);
          border: 1px solid rgba(233, 69, 96, 0.3);
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
        }

        .rogue-page .install-info h3 {
          color: #e94560;
          margin-bottom: 10px;
        }

        .rogue-page .install-info li {
          color: #a8b2d8;
        }

        .rogue-page .potato-divider {
          margin: 20px 0;
          text-align: center;
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .rogue-page .link-btn {
          color: #e94560 !important;
        }

        .rogue-page .link-btn:hover {
          color: #c62a47 !important;
        }

        .rogue-page .auth-mode-toggle {
          color: #a8b2d8;
        }

        .rogue-page .auth-error {
          background: rgba(233, 69, 96, 0.15);
          border: 1px solid #e94560;
          color: #e94560;
        }

        .rogue-page .toggle-text {
          color: #a8b2d8 !important;
        }

        .rogue-return-url-hint {
          color: #a8b2d8;
          margin-top: 8px;
          font-size: 0.9rem;
        }

        .floating-rogue {
          position: absolute;
          font-size: 2rem;
          animation: float 6s ease-in-out infinite;
          pointer-events: none;
          opacity: 0.4;
        }
      `}</style>
      <div className="oauth-page rogue-page">
        <div className="potato-bg">
          <div className="floating-rogue" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🕵️</div>
          <div className="floating-rogue" style={{ top: '20%', right: '15%', animationDelay: '1s' }}>🔓</div>
          <div className="floating-rogue" style={{ bottom: '30%', left: '20%', animationDelay: '2s' }}>🚀</div>
          <div className="floating-rogue" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }}>⚡</div>
          <div className="floating-rogue" style={{ top: '50%', left: '5%', animationDelay: '4s' }}>🎯</div>
          <div className="floating-rogue" style={{ top: '60%', right: '5%', animationDelay: '5s' }}>🕵️</div>
        </div>

        <div className="container">
          <div className="logo">🕵️</div>
          <h1 className="title rogue-title">Rogue Install</h1>
          <p className="subtitle">Unauthorized HubSpot OAuth test flow</p>

          {showForm && (
            <form id="rogueLoginForm" onSubmit={handleAuth}>
              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="rogue-email">📧 Email:</label>
                <input
                  type="email"
                  id="rogue-email"
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
                  <label htmlFor="rogue-username">👤 Username:</label>
                  <input
                    type="text"
                    id="rogue-username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="rogue_agent"
                    autoComplete="username"
                    required
                    disabled={buttonDisabled}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="rogue-password">🔐 Password:</label>
                <input
                  type="password"
                  id="rogue-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your secret passphrase"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  disabled={buttonDisabled}
                />
              </div>

              <div className="form-group">
                <label className="toggle-label" htmlFor="rogue-redirect-after-install">
                  <input
                    type="checkbox"
                    id="rogue-redirect-after-install"
                    checked={redirectAfterHubSpot}
                    onChange={(e) => setRedirectAfterHubSpot(e.target.checked)}
                    disabled={buttonDisabled}
                  />
                  <span className="toggle-text">Redirect to HubSpot after install complete</span>
                </label>
                {redirectAfterHubSpot && (
                  <p className="rogue-return-url-hint">
                    Add <code style={{ color: '#e6f1ff' }}>returnUrl</code> to this page&apos;s URL.
                  </p>
                )}
              </div>

              <div className="potato-divider">🕵️ • ⚡ • 🔓</div>

              <button type="submit" className="btn" disabled={buttonDisabled}>
                {buttonText}
              </button>

              <div className="auth-mode-toggle">
                {authMode === 'login' ? (
                  <p>
                    New agent?{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setAuthMode('signup');
                        setButtonText('🌱 Create Account');
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
                        setButtonText('🔓 Begin Rogue Install');
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
                <h3>🎯 Rogue Scopes:</h3>
                <ul>
                  <li>✅ settings.users.read</li>
                  <li>✅ oauth</li>
                  <li>✅ crm.objects.contacts.read</li>
                </ul>
              </div>
            </form>
          )}

          {showWelcome && (
            <div
              id="rogueWelcomeMessage"
              className="welcome-message"
              dangerouslySetInnerHTML={{ __html: welcomeMessage }}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default RogueInstallPage;
