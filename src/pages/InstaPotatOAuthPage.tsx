import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { getAppConfig } from '../lib/appConfig';
import { exchangeCodeForToken } from '../lib/hubspotOAuth';
import './InstaPotatOAuthPage.css';

const INSTAPOTAT_CONFIG = getAppConfig('instapotat');

function InstaPotatOAuthPage() {
  const [statusMessage, setStatusMessage] = useState('🥔 Preparing your InstaPotat...');
  const [isProcessing, setIsProcessing] = useState(true);
  const [focusRestored, setFocusRestored] = useState(false);

  // Check if test mode is enabled via query param
  const isTestMode = new URLSearchParams(window.location.search).get('testMode') === 'true';

  useEffect(() => {
    handleInstallation();
  }, []);

  // Listen for postMessage from the auth callback page to restore focus
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data === 'auth_complete') {
        // Attempt to bring this popup window to the foreground
        window.focus();
        setFocusRestored(true);

        // Reset the focus indicator after a short delay
        setTimeout(() => {
          setFocusRestored(false);
        }, 3000);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  function handleTestAuthFlow() {
    // Open the auth callback test page in a new tab
    window.open('/auth-callback-test', '_blank');
  }

  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  }

  async function handleInstallation(): Promise<void> {
    const code = getQueryParam('code');
    const returnUrl = getQueryParam('returnUrl');

    if (!code) {
      setStatusMessage('🚨 Missing authorization code. Installation failed.');
      setIsProcessing(false);
      return;
    }

    if (!returnUrl) {
      setStatusMessage('🚨 Missing return URL. Installation failed.');
      setIsProcessing(false);
      return;
    }

    try {
      setStatusMessage('🔄 Exchanging code for access token...');

      const result = await exchangeCodeForToken({
        code,
        appName: 'instapotat',
        clientId: INSTAPOTAT_CONFIG.clientId,
        clientSecret: INSTAPOTAT_CONFIG.clientSecret,
        redirectUri: INSTAPOTAT_CONFIG.redirectUri,
        skipDbSave: true,
      });

      if (!result.success || !result.accessToken) {
        throw new Error(result.error || 'No access token received from HubSpot');
      }

      if (!result.portalId) {
        throw new Error('No portal ID found in account data');
      }

      localStorage.setItem('instapotat_access_token', result.accessToken);
      localStorage.setItem('instapotat_portal_id', result.portalId);

      setStatusMessage(`🎉 InstaPotat installed successfully for Portal ${result.portalId}!`);
      setIsProcessing(false);

      setTimeout(() => {
        setStatusMessage('🌟 Redirecting you now...');
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 500);
      }, 1500);

    } catch (error) {
      console.error('Installation failed:', error);
      setStatusMessage(`🍠 Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Header />
      <div className="instapotat-page">
        <div className="potato-bg">
        <div className="floating-potato">🥔</div>
        <div className="floating-potato">⚡</div>
        <div className="floating-potato">🥔</div>
        <div className="floating-potato">⚡</div>
        <div className="floating-potato">🥔</div>
        <div className="floating-potato">⚡</div>
      </div>

      <div className="container">
        <div className="logo">⚡🥔</div>
        <h1 className="title">InstaPotat</h1>
        <p className="subtitle">Lightning-fast potato installation!</p>

        <div className="status-card">
          <div className={`status-icon ${isProcessing ? 'processing' : 'complete'}`}>
            {isProcessing ? '🔄' : '✅'}
          </div>
          <div className="status-message">
            {statusMessage}
          </div>
          {isProcessing && (
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          )}
        </div>

        <div className="info-box">
          <p className="info-text">
            ⚡ <strong>No sign-in required!</strong> InstaPotat installs instantly.
          </p>
          <p className="info-text">
            🔒 <strong>No personal data collected.</strong> Just pure potato power.
          </p>
        </div>

        {/* Focus restoration indicator */}
        {focusRestored && (
          <div className="auth-success-banner">
            🎯 Focus restored! You're back in the popup.
          </div>
        )}

        {/* Test mode: Third-party auth flow simulation */}
        {isTestMode && (
          <div className="test-mode-section">
            <div className="test-mode-header">
              <span className="test-badge">TEST MODE</span>
              <h3>Third-Party Auth Flow Test</h3>
            </div>
            <p className="test-description">
              Click the button below to simulate opening a third-party authentication
              page (like QuickBooks). After clicking the button on that page, this
              popup should regain focus.
            </p>
            <button
              className="test-auth-button"
              onClick={handleTestAuthFlow}
            >
              🔐 Test Third-Party Auth Flow
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default InstaPotatOAuthPage;

