import { useEffect, useState, useRef } from 'react';
import { loginUser, registerUser, createOAuthState, consumeOAuthState } from '../lib/auth';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';
import { useAuth } from '../hooks/useAuth';
import './AugratinOAuth.css';

const CLIENT_ID = import.meta.env.VITE_AU_GRATIN_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_AU_GRATIN_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_AU_GRATIN_REDIRECT_URI;

type OAuthStep = 'authorize' | 'finalize';
type UiStep = 'auth' | 'tierSelection' | 'processing' | 'success' | 'error';
type AuthMode = 'login' | 'signup';
type Tier = 1 | 2 | 3;

interface TierConfig {
  name: string;
  icon: string;
  description: string;
  features: string[];
  scopes: string[];
  optionalScopes: string[];
  conditionalScopes: string[];
}

const CONDITIONAL_SCOPES = [
  'automation.sequences.read',
  'automation.sequences.enrollments.write',
  'scheduler.meetings.meeting-link.read',
  'settings.users.read',
  'settings.users.write',
];

const TIER_CONFIGS: Record<Tier, TierConfig> = {
  1: {
    name: 'Essential CRM',
    icon: '🧀',
    description: 'Basic creamy goodness for core CRM operations',
    features: [
      'CRM Data Manager',
      'Deal Health Tracker',
      'Segment Sync'
    ],
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.lists.read',
      'crm.lists.write'
    ],
    optionalScopes: [],
    conditionalScopes: []
  },
  2: {
    name: 'Enhanced',
    icon: '🥔',
    description: 'Extra layers of functionality',
    features: [
      'Everything in Essential',
      'Inbox Helper',
      'Attachment Uploader',
      'Form Submissions Viewer',
      'Timeline Event Generator'
    ],
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.lists.read',
      'crm.lists.write'
    ],
    optionalScopes: [
      'conversations.read',
      'conversations.write',
      'files',
      'forms',
      'timeline'
    ],
    conditionalScopes: []
  },
  3: {
    name: 'Complete',
    icon: '🍽️',
    description: 'Fully loaded au gratin with all the toppings',
    features: [
      'Everything in Enhanced',
      'Workflow Kickoff',
      'Events Test Harness',
      'Sensitive Data Mode',
      'Meeting Scheduler',
      'User Management'
    ],
    scopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.lists.read',
      'crm.lists.write'
    ],
    optionalScopes: [
      'conversations.read',
      'conversations.write',
      'files',
      'forms',
      'timeline',
      'automation',
      'analytics.behavioral_events.send'
    ],
    conditionalScopes: CONDITIONAL_SCOPES
  }
};

function AugratinOAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [uiStep, setUiStep] = useState<UiStep>('auth');
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [portalId, setPortalId] = useState<string | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const hasProcessedAuth = useRef(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🧀 Enter the Kitchen');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // For authorize step: skip auth form if already logged in
  useEffect(() => {
    const urlStep = getQueryParam('step');
    if (urlStep !== 'finalize' && user && !authLoading && uiStep === 'auth') {
      setUiStep('tierSelection');
    }
  }, [user, authLoading, uiStep]);

  // For authorize step: progress to tier selection after successful login
  useEffect(() => {
    if (user && !authLoading && waitingForAuth && !hasProcessedAuth.current) {
      hasProcessedAuth.current = true;
      setWaitingForAuth(false);
      setUiStep('tierSelection');
    }
  }, [user, authLoading, waitingForAuth]);

  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }

  function initializeApp(): void {
    const urlStep = getQueryParam('step') as OAuthStep | null;

    if (urlStep === 'finalize') {
      const code = getQueryParam('code');
      const state = getQueryParam('state');
      handleFinalizeStep(code, state);
    }
    // authorize: default state handles the login form display
  }

  async function handleFinalizeStep(code: string | null, state: string | null): Promise<void> {
    setUiStep('processing');
    setStatusMessage('🔄 Validating your au gratin credentials...');

    if (!code) {
      setStatusMessage('🚨 Missing authorization code. Your au gratin got lost in transit!');
      setUiStep('error');
      return;
    }

    if (!state) {
      setStatusMessage('🚨 Missing state parameter. Your au gratin might be compromised!');
      setUiStep('error');
      return;
    }

    const { userId, error: stateError } = await consumeOAuthState(state);

    if (stateError || !userId) {
      setStatusMessage(`🚨 Security Error: ${stateError || 'Invalid state token'}. Your session may have expired!`);
      setUiStep('error');
      return;
    }

    try {
      const result = await exchangeCodeForToken({
        code,
        appName: 'potataugratin',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: REDIRECT_URI,
        userId
      });

      if (!result.success) {
        setStatusMessage(`🧀 Failed to complete installation: ${result.error}`);
        setUiStep('error');
        return;
      }

      if (result.portalId) {
        setPortalId(result.portalId);
      }

      setUiStep('success');
    } catch (error) {
      setStatusMessage(`🧀 Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUiStep('error');
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('🧀 Please enter both email and password!');
      return;
    }

    if (authMode === 'signup' && !username) {
      setAuthError('🧀 Please enter a username!');
      return;
    }

    if (password.length < 6) {
      setAuthError('🧀 Password must be at least 6 characters!');
      return;
    }

    setButtonDisabled(true);
    setButtonText(authMode === 'login' ? '🔐 Authenticating...' : '🌱 Creating your account...');
    hasProcessedAuth.current = false;

    try {
      if (authMode === 'signup') {
        const { user: newUser, error: signupError } = await registerUser({ email, password, username });

        if (signupError) {
          setAuthError(`🧀 Sign up failed: ${signupError}`);
          setButtonDisabled(false);
          setButtonText('🧀 Enter the Kitchen');
          return;
        }

        if (!newUser) {
          setAuthError('🧀 Sign up failed. Please try again.');
          setButtonDisabled(false);
          setButtonText('🧀 Enter the Kitchen');
          return;
        }

        setButtonText('🔐 Logging you in...');

        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError || !authUser) {
          setAuthError('🧀 Account created but login failed. Please try logging in.');
          setButtonDisabled(false);
          setButtonText('🧀 Enter the Kitchen');
          setAuthMode('login');
          return;
        }
      } else {
        const { user: authUser, error: loginError } = await loginUser(email, password);

        if (loginError) {
          setAuthError(`🧀 Authentication failed: ${loginError}`);
          setButtonDisabled(false);
          setButtonText('🧀 Enter the Kitchen');
          return;
        }

        if (!authUser) {
          setAuthError('🧀 Authentication failed. Please check your credentials.');
          setButtonDisabled(false);
          setButtonText('🧀 Enter the Kitchen');
          return;
        }
      }

      setButtonText('✅ Authenticated!');
      setWaitingForAuth(true);
      // useEffect will handle progression to tier selection
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setAuthError(`🧀 Error: ${errorMessage}`);
      setButtonDisabled(false);
      setButtonText('🧀 Enter the Kitchen');
    }
  }

  async function handleTierSelect(tier: Tier): Promise<void> {
    setSelectedTier(tier);

    const returnUrl = getQueryParam('returnUrl');

    if (!returnUrl) {
      alert('🧀 No marketplace URL provided. Stay here and enjoy the au gratin!');
      return;
    }

    setUiStep('processing');
    setStatusMessage('🔐 Creating secure state token...');

    const { stateToken, error: stateError } = await createOAuthState(10);

    if (stateError || !stateToken) {
      setStatusMessage(`🧀 Failed to create secure state: ${stateError}`);
      setUiStep('error');
      return;
    }

    try {
      const tierConfig = TIER_CONFIGS[tier];
      const url = new URL(returnUrl);

      const scopeParam = [...tierConfig.scopes, ...tierConfig.conditionalScopes];
      if (scopeParam.length > 0) {
        url.searchParams.set('scope', scopeParam.join(' '));
      }

      if (tierConfig.optionalScopes.length > 0) {
        url.searchParams.set('optionalScope', tierConfig.optionalScopes.join(' '));
      }

      url.searchParams.set('state', stateToken);

      window.location.href = url.toString();
    } catch {
      window.location.href = returnUrl;
    }
  }

  function handleReturnToMarketplace(): void {
    const returnUrl = getQueryParam('returnUrl');

    if (!returnUrl) {
      alert('🧀 No marketplace URL provided. Stay here and enjoy the au gratin!');
      return;
    }

    window.location.href = returnUrl;
  }

  return (
    <div className="augratin-oauth-page">
      <div className="potato-bg">
        <div className="floating-potato" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🧀</div>
        <div className="floating-potato" style={{ top: '20%', right: '15%', animationDelay: '1s' }}>🥔</div>
        <div className="floating-potato" style={{ bottom: '30%', left: '20%', animationDelay: '2s' }}>🧈</div>
        <div className="floating-potato" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }}>🧀</div>
        <div className="floating-potato" style={{ top: '50%', left: '5%', animationDelay: '4s' }}>🥔</div>
        <div className="floating-potato" style={{ top: '60%', right: '5%', animationDelay: '5s' }}>🍽️</div>
      </div>

      <div className="augratin-container">
        <div className="logo">🧀</div>
        <h1 className="title">Au Gratin OAuth</h1>
        <p className="subtitle">Layered with creamy authentication goodness</p>

        {/* Authorize: Step 1 — Login */}
        {uiStep === 'auth' && (
          <form onSubmit={handleAuthSubmit} className="auth-form">
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
                placeholder="Your secret recipe"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>

            <div className="potato-divider">🧀 • 🥔 • 🧈</div>

            <button type="submit" className="btn" disabled={buttonDisabled}>
              {buttonText}
            </button>

            <div className="auth-mode-toggle">
              {authMode === 'login' ? (
                <p>
                  New chef? {' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setAuthMode('signup');
                      setButtonText('🧀 Enter the Kitchen');
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
                      setButtonText('🧀 Enter the Kitchen');
                      setAuthError(null);
                      setUsername('');
                    }}
                  >
                    Login here
                  </button>
                </p>
              )}
            </div>
          </form>
        )}

        {/* Authorize: Step 2 — Tier Selection */}
        {uiStep === 'tierSelection' && (
          <div className="tier-selection">
            <h2 className="tier-title">Choose Your Au Gratin Layer</h2>
            <p className="tier-subtitle">Select the perfect level of permissions for your app</p>

            <div className="tier-cards">
              {([1, 2, 3] as Tier[]).map((tier) => {
                const config = TIER_CONFIGS[tier];
                return (
                  <div key={tier} className={`tier-card tier-${tier}`}>
                    <div className="tier-icon">{config.icon}</div>
                    <h3 className="tier-name">{config.name}</h3>
                    <p className="tier-description">{config.description}</p>

                    <div className="tier-features">
                      <h4>Features:</h4>
                      <ul>
                        {config.features.map((feature, idx) => (
                          <li key={idx}>{feature}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="tier-scope-count">
                      {config.scopes.length} required
                      {config.optionalScopes.length > 0 && ` + ${config.optionalScopes.length} optional`}
                      {config.conditionalScopes.length > 0 && ` + ${config.conditionalScopes.length} conditional`}
                    </div>

                    <button
                      className="tier-select-btn"
                      onClick={() => handleTierSelect(tier)}
                    >
                      Select {config.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Processing (authorize state creation or finalize token exchange) */}
        {uiStep === 'processing' && (
          <div className="authorizing-message">
            <div className="spinner">🧀</div>
            <h2>Preparing Your Au Gratin...</h2>
            <p>{statusMessage}</p>
          </div>
        )}

        {/* Error */}
        {uiStep === 'error' && (
          <div className="success-message">
            <div className="success-icon">❌</div>
            <h2>Something Went Wrong</h2>
            <p className="success-description">{statusMessage}</p>
            <button className="return-btn" onClick={handleReturnToMarketplace}>
              🍽️ Return to Marketplace
            </button>
          </div>
        )}

        {/* Finalize: Success */}
        {uiStep === 'success' && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Perfect! Your Au Gratin is Ready!</h2>
            <p className="success-description">
              Your HubSpot app has been successfully installed with the selected permissions.
              All tokens have been securely saved to your account!
            </p>

            {portalId && (
              <div className="oauth-code-display">
                <h3>🏢 Portal ID</h3>
                <code className="code-block">{portalId}</code>
                <p className="code-hint">Your HubSpot account is now connected</p>
              </div>
            )}

            {selectedTier && TIER_CONFIGS[selectedTier].optionalScopes.length > 0 && (
              <div className="oauth-code-display">
                <h3>✨ Optional Scopes</h3>
                <code className="code-block">{TIER_CONFIGS[selectedTier].optionalScopes.join(' ')}</code>
              </div>
            )}

            {selectedTier && TIER_CONFIGS[selectedTier].conditionalScopes.length > 0 && (
              <div className="oauth-code-display">
                <h3>🔀 Conditional Scopes</h3>
                <code className="code-block">{TIER_CONFIGS[selectedTier].conditionalScopes.join(' ')}</code>
              </div>
            )}

            <button className="return-btn" onClick={handleReturnToMarketplace}>
              🍽️ Return to Marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AugratinOAuthPage;
