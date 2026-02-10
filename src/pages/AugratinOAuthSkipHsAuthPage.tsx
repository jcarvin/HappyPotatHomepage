import { useEffect, useState } from 'react';
import { loginUser, registerUser } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import './AugratinOAuth.css';

const CLIENT_ID = import.meta.env.VITE_AU_GRATIN_CLIENT_ID;

type Step = 'auth' | 'tierSelection' | 'authorizing' | 'success';
type AuthMode = 'login' | 'signup';
type Tier = 1 | 2 | 3;

interface TierConfig {
  name: string;
  icon: string;
  description: string;
  features: string[];
  scopes: string[];
}

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
    ]
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
      'crm.lists.write',
      'conversations.read',
      'conversations.write',
      'files',
      'forms',
      'timeline'
    ]
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
      'crm.lists.write',
      'conversations.read',
      'conversations.write',
      'files',
      'forms',
      'timeline',
      'automation',
      'analytics.behavioral_events.send',
      'automation.sequences.read',
      'automation.sequences.enrollments.write',
      'scheduler.meetings.meeting-link.read',
      'settings.users.read',
      'settings.users.write'
    ]
  }
};

function AugratinOAuthSkipHsAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('auth');
  // const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('🧀 Enter the Kitchen');
  const [buttonDisabled, setButtonDisabled] = useState(false);

  // Check for OAuth callback - this takes priority over everything
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authComplete = params.get('authComplete');
    const code = params.get('code');
    const step = params.get('step');

    console.log('🧀 Au Gratin OAuth initialized', {
      authComplete,
      hasCode: !!code,
      stepParam: step,
      user: !!user,
      authLoading,
      isPopup: !!window.opener
    });

    // If there's a code but no authComplete, it's from old OAuth flow - ignore it
    if (code && !authComplete) {
      console.log('⚠️ Warning: Found code parameter without authComplete - ignoring (old OAuth flow)');
      // Clean up the URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('code');
      newUrl.searchParams.delete('step');
      window.history.replaceState({}, '', newUrl.toString());
      return;
    }

    if (authComplete === 'true' && code) {
      console.log('🎉 OAuth callback detected - auth complete!');

      // If we're in a popup, notify the parent window and close
      if (window.opener && !window.opener.closed) {
        console.log('📤 Notifying parent window from popup');
        window.opener.postMessage({
          type: 'oauth_complete',
          code,
          params: window.location.search
        }, window.location.origin);

        // Give the parent a moment to receive the message, then close
        setTimeout(() => {
          console.log('🔒 Closing OAuth popup');
          window.close();
        }, 500);
      } else {
        // We're in the main window, show success
        setStep('success');
      }
    }
  }, []);

  // Auto-progress to tier selection when authenticated
  // BUT only if we're not in an OAuth callback flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authComplete = params.get('authComplete');

    // Don't auto-progress if we're coming back from OAuth
    if (authComplete === 'true') {
      console.log('🔒 Skipping auto-progress - OAuth callback in progress');
      return;
    }

    if (user && !authLoading && step === 'auth') {
      console.log('✅ User authenticated, moving to tier selection');
      setStep('tierSelection');
    }
  }, [user, authLoading, step]);

  // Log step changes for debugging
  useEffect(() => {
    console.log('📍 Current step:', step);
  }, [step]);

  // Listen for messages from OAuth popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Verify the message is from our origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'oauth_complete') {
        console.log('📥 Received OAuth completion from popup', event.data);

        // Update the URL with the OAuth callback parameters
        const newUrl = new URL(window.location.href);
        const params = new URLSearchParams(event.data.params);
        params.forEach((value, key) => {
          newUrl.searchParams.set(key, value);
        });
        window.history.replaceState({}, '', newUrl.toString());

        // Show success screen
        setStep('success');
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
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

        setButtonText('✅ Authenticated!');
        // useEffect will handle progression to tier selection
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

        setButtonText('✅ Authenticated!');
        // useEffect will handle progression to tier selection
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setAuthError(`🧀 Error: ${errorMessage}`);
      setButtonDisabled(false);
      setButtonText(authMode === 'login' ? '🧀 Enter the Kitchen' : '🧀 Enter the Kitchen');
    }
  }

  function handleTierSelect(tier: Tier): void {
    // setSelectedTier(tier);
    setStep('authorizing');

    // Build OAuth URL
    const tierConfig = TIER_CONFIGS[tier];
    const scopeString = tierConfig.scopes.join('%20');

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('authComplete', 'true');
    const redirectUri = currentUrl.toString();

    const authUrl = `https://app.hubspotqa.com/oauth/authorize?client_id=${CLIENT_ID}&scope=${scopeString}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log('🚀 Opening OAuth popup for tier', tier);
    console.log('📋 Scopes:', tierConfig.scopes.length, 'scopes');

    // Open OAuth in popup instead of redirecting
    const popup = window.open(
      authUrl,
      'hubspot-oauth',
      'width=600,height=800,left=400,top=100,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      alert('🧀 Popup blocked! Please allow popups for this site.');
      setStep('tierSelection');
      return;
    }

    // Listen for popup to complete
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        console.log('🔔 OAuth popup was closed');

        // Check if we should be on success screen
        const params = new URLSearchParams(window.location.search);
        const authComplete = params.get('authComplete');
        const code = params.get('code');

        if (authComplete === 'true' && code) {
          console.log('✅ OAuth completed successfully!');
          setStep('success');
        } else {
          console.log('❌ OAuth was cancelled or failed');
          setStep('tierSelection');
        }
      }
    }, 500);
  }

  function handleReturnToMarketplace(): void {
    const returnUrl = getQueryParam('returnUrl');
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      // Fallback if no returnUrl
      alert('🧀 No marketplace URL provided. Stay here and enjoy the au gratin!');
    }
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

        {/* Step 1: Authentication */}
        {step === 'auth' && (
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

        {/* Step 2: Tier Selection */}
        {step === 'tierSelection' && (
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
                      {config.scopes.length} permissions
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

        {/* Step 3: Authorizing (shown briefly before redirect) */}
        {step === 'authorizing' && (
          <div className="authorizing-message">
            <div className="spinner">🧀</div>
            <h2>Preparing Your Au Gratin...</h2>
            <p>Redirecting to HubSpot for authorization</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Perfect! Your Au Gratin is Ready!</h2>
            <p className="success-description">
              Your HubSpot app has been successfully installed with the selected permissions.
              Time to serve up some delicious CRM functionality!
            </p>

            <button className="return-btn" onClick={handleReturnToMarketplace}>
              🍽️ Return to Marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AugratinOAuthSkipHsAuthPage;
