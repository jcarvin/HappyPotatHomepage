import { useEffect, useState, useRef } from 'react';
import { loginUser, updateApiToken } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';
import './OAuthPage.css';

const CLIENT_ID = import.meta.env.CLIENT_ID;
const CLIENT_SECRET = import.meta.env.CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.REDIRECT_URI;

type OAuthStep = 'authorize' | 'finalize' | 'legacy';

interface AccountInfo {
  portalId: string;
}

function OAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [buttonText, setButtonText] = useState('Plant Your Login 🌱');
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [saveStateTogggle, setSaveStateToggle] = useState(true);
  const [redirectAfterInstallToggle, setRedirectAfterInstallToggle] = useState(true);
  const [currentStep, setCurrentStep] = useState<OAuthStep>('legacy');
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const hasProcessedAuth = useRef(false);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

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

  function generateStateParameter(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function setSecureCookie(name: string, value: string, maxAgeMinutes: number = 10): void {
    const expires = new Date(Date.now() + maxAgeMinutes * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=None; Secure`;
    console.log('🍪 State saved to cookies:', value, document.cookie);
  }

  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      console.log(`🍪 Retrieved cookie '${name}':`, cookieValue);
      return cookieValue || null;
    }
    console.log(`🍪 Cookie '${name}' not found. Available cookies:`, document.cookie);
    return null;
  }

  function deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
  }

  function displayWelcomeMessage(portalId: string): void {
    setShowForm(false);

    const returnUrl = getQueryParam('returnUrl');
    const step = getQueryParam('step');

    let shouldRedirect = true;
    if (step === 'finalize') {
      const redirectPreference = getCookie('redirect_after_install');
      shouldRedirect = redirectPreference === null || redirectPreference === 'true';
      if (redirectPreference !== null) {
        deleteCookie('redirect_after_install');
      }
    }

    let countdown = 3;

    if (!returnUrl) {
      setWelcomeMessage("🥔 Oops! No returnUrl found. Your potato needs a destination!");
      setShowWelcome(true);
      return;
    }

    if (shouldRedirect) {
      setWelcomeMessage(`🎉 Welcome back, Potato Farmer ${portalId}!<br>🚀 Redirecting your spud in ${countdown} seconds...`);
    } else {
      setWelcomeMessage(`🎉 Welcome back, Potato Farmer ${portalId}!<br>✅ Install successful! You can stay here and enjoy your potatoes! 🥔`);
    }
    setShowWelcome(true);

    if (returnUrl && shouldRedirect) {
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          setWelcomeMessage(`🎉 Welcome back, Potato Farmer ${portalId}!<br>🚀 Redirecting your spud in ${countdown} seconds...`);
        } else {
          clearInterval(countdownInterval);
          setWelcomeMessage('🌟 Harvesting your data... redirecting now! 🥔');
          setTimeout(() => {
            window.location.href = returnUrl;
          }, 500);
        }
      }, 1000);
    }
  }

  async function fetchAccountInfo(token: string): Promise<AccountInfo> {
    const response = await fetch('https://us-central1-hubspot-oauth-proxy.cloudfunctions.net/get_account_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ access_token: token })
    });
    return response.json();
  }

  function initializeApp(): void {
    const step = getQueryParam('step') as OAuthStep | null;
    const code = getQueryParam('code');
    const state = getQueryParam('state');

    console.log('🥔 Initializing HappyPotato with step:', step);

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

  function handleFinalizeStep(code: string | null, state: string | null): void {
    console.log('🥔 Finalize step: Validating state and completing installation');

    if (!code) {
      console.log('🚨 Finalize Error: Missing authorization code. Your potato got lost in transit!');
      showError('🚨 Finalize Error: Missing authorization code. Your potato got lost in transit!');
      return;
    }

    if (!state) {
      console.log('🚨 Security Error: Missing state parameter. Your potato might be compromised!');
      showError('🚨 Security Error: Missing state parameter. Your potato might be compromised!');
      return;
    }

    const storedState = getCookie('oauth_state');
    if (!storedState) {
      console.log('🚨 Security Error: No stored state found. Your potato session expired!');
      showError('🚨 Security Error: No stored state found. Your potato session expired!');
      return;
    }

    if (state !== storedState) {
      console.log('🚨 Security Error: State mismatch detected. Possible CSRF attack blocked! 🛡️');
      showError('🚨 Security Error: State mismatch detected. Possible CSRF attack blocked! 🛡️');
      deleteCookie('oauth_state');
      return;
    }

    console.log('✅ State validation successful - proceeding with installation');
    deleteCookie('oauth_state');

    exchangeCodeForToken(code);
  }

  async function exchangeCodeForToken(code: string): Promise<void> {
    setButtonText('🔄 Validating your potato credentials...');
    setShowWelcome(true);
    setShowForm(false);
    setWelcomeMessage('🔄 Validating your potato credentials...');

    try {
      const response = await fetch('https://us-central1-hubspot-oauth-proxy.cloudfunctions.net/exchange_code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI
        })
      });

      const data = await response.json();

      if (data.access_token) {
        // Store in localStorage as backup
        localStorage.setItem('access_token', data.access_token);

        // Save access token to Supabase user profile
        console.log('💾 Saving HubSpot access token to Supabase...');
        const { success, error: saveError } = await updateApiToken(data.access_token);

        if (saveError) {
          console.error('❌ Failed to save access token to Supabase:', saveError);
          showError('🍠 Token received but failed to save to your profile. Please try again.');
          return;
        }

        if (success) {
          console.log('✅ Successfully saved HubSpot access token to Supabase!');
        }

        // Fetch account info
        const accountData = await fetchAccountInfo(data.access_token);

        if (accountData.portalId) {
          displayWelcomeMessage(accountData.portalId);
        } else {
          console.error('Portal ID not found in response', accountData);
          showError('🥔 Oops! Could not find your potato farm ID. Please try again!');
        }
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('Error during token exchange or fetching account info:', error);
      showError('🍠 Something went wrong in the potato field! Please try again.');
    }
  }

  function handleAuthorizeSubmit(): void {
    const stateParam = generateStateParameter();
    const returnUrl = getQueryParam('returnUrl');

    if (saveStateTogggle) {
      setSecureCookie('oauth_state', stateParam, 10);
      console.log('🍪 State saved to cookies:', stateParam);
    } else {
      console.log('🚫 State not saved to cookies (user disabled)');
    }

    setSecureCookie('redirect_after_install', redirectAfterInstallToggle.toString(), 30);
    console.log('🍪 Redirect preference saved to cookies:', redirectAfterInstallToggle);

    const loadingMessages = [
      "🌱 Planting security seeds...",
      "🔒 Securing your potato patch...",
      "🎫 Preparing authorization token...",
      "🍯 Adding extra security seasoning..."
    ];
    let messageIndex = 0;

    setButtonText(loadingMessages[0]);

    const loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length;
      setButtonText(loadingMessages[messageIndex]);
    }, 800);

    setTimeout(() => {
      clearInterval(loadingInterval);

      console.log('🎫 Authorization successful, redirecting with state:', stateParam);

      if (returnUrl) {
        const returnUrlObj = new URL(returnUrl);
        returnUrlObj.searchParams.set('state', stateParam);
        window.location.href = returnUrlObj.toString();
      }
    }, 5000);
  }

  function handleLegacySubmit(): void {
    const code = getQueryParam('code');

    // If we have a code, exchange it for a token
    if (code) {
      console.log('🔄 Legacy flow: Found code, exchanging for token');
      const loadingMessages = [
        "🌱 Planting seeds...",
        "🥔 Growing potatoes...",
        "🌿 Watering the field...",
        "☀️ Waiting for sunshine...",
        "🚜 Harvesting happiness..."
      ];
      let messageIndex = 0;

      setButtonText(loadingMessages[0]);

      const loadingInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setButtonText(loadingMessages[messageIndex]);
      }, 800);

      setTimeout(() => {
        clearInterval(loadingInterval);
        exchangeCodeForToken(code);
      }, 2000);
      return;
    }

    // If no code in legacy flow, redirect to HubSpot OAuth
    // Note: Legacy flow normally expects a code to already exist, but we'll
    // handle the case where the user is starting fresh by redirecting to OAuth
    console.log('🚀 Legacy flow: No code found, initiating OAuth redirect');
    setButtonText('🚀 Redirecting to HubSpot...');
    setShowForm(false);
    setShowWelcome(true);
    setWelcomeMessage('🚀 Redirecting to HubSpot for authorization...');

    // Build the full OAuth URL that will eventually redirect back
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('code', 'PLACEHOLDER'); // Will be replaced by HubSpot

    // Generate HubSpot OAuth URL
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'oauth');

    setTimeout(() => {
      window.location.href = authUrl.toString();
    }, 1500);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthError(null);

    const returnUrl = getQueryParam('returnUrl');

    if (!returnUrl) {
      showError('🥔 Missing returnUrl! Your potato needs a destination to return to!');
      return;
    }

    // Validate email and password
    if (!email || !password) {
      setAuthError('🥔 Please enter both email and password!');
      return;
    }

    if (password.length < 6) {
      setAuthError('🥔 Password must be at least 6 characters!');
      return;
    }

    setButtonDisabled(true);
    setButtonText('🔐 Authenticating with Supabase...');
    hasProcessedAuth.current = false;

    try {
      // Authenticate with Supabase first
      const { user: authUser, error: loginError } = await loginUser(email, password);

      if (loginError) {
        setAuthError(`🍠 Authentication failed: ${loginError}`);
        setButtonDisabled(false);
        setButtonText('Plant Your Login 🌱');
        return;
      }

      if (!authUser) {
        setAuthError('🥔 Authentication failed. Please check your credentials.');
        setButtonDisabled(false);
        setButtonText('Plant Your Login 🌱');
        return;
      }

      // Success! Wait for AuthContext to update
      console.log('✅ Supabase authentication successful for user:', authUser.email);
      setWaitingForAuth(true);
      setButtonText('🌱 Authenticated! Processing...');
      // useEffect will handle the OAuth flow once AuthContext updates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setAuthError(`🍠 Error: ${errorMessage}`);
      setButtonDisabled(false);
      setButtonText('Plant Your Login 🌱');
    }
  }

  return (
    <div className="oauth-page">
      <div className="potato-bg">
        <div className="floating-potato" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🥔</div>
        <div className="floating-potato" style={{ top: '20%', right: '15%', animationDelay: '1s' }}>🍟</div>
        <div className="floating-potato" style={{ bottom: '30%', left: '20%', animationDelay: '2s' }}>🥔</div>
        <div className="floating-potato" style={{ bottom: '15%', right: '10%', animationDelay: '3s' }}>🍟</div>
        <div className="floating-potato" style={{ top: '50%', left: '5%', animationDelay: '4s' }}>🥔</div>
        <div className="floating-potato" style={{ top: '60%', right: '5%', animationDelay: '5s' }}>🍟</div>
      </div>

      <div className="container">
        <div className="logo">🥔</div>
        <h1 className="title">HappyPotato</h1>
        <p className="subtitle">Where potatoes meet happiness!</p>

        {showForm && (
          <form id="loginForm" onSubmit={handleSubmit}>
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

            <div className="form-group">
              <label htmlFor="password">🔐 Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secret potato recipe"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </div>

            {currentStep === 'authorize' && (
              <>
                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={saveStateTogggle}
                      onChange={(e) => setSaveStateToggle(e.target.checked)}
                    />
                    <span className="toggle-text">🍪 Save security state to cookies</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={redirectAfterInstallToggle}
                      onChange={(e) => setRedirectAfterInstallToggle(e.target.checked)}
                    />
                    <span className="toggle-text">🚀 Redirect after install</span>
                  </label>
                </div>
              </>
            )}

            <div className="potato-divider">🥔 • 🍟 • 🥔</div>

            <button type="submit" className="btn" disabled={buttonDisabled}>
              {buttonText}
            </button>
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
  );
}

export default OAuthPage;

