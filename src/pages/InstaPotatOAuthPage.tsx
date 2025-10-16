import { useEffect, useState } from 'react';
import './InstaPotatOAuthPage.css';

const CLIENT_ID = import.meta.env.VITE_HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_HUBSPOT_REDIRECT_URI;

interface AccountInfo {
  portalId: string;
}

function InstaPotatOAuthPage() {
  const [statusMessage, setStatusMessage] = useState('🥔 Preparing your InstaPotat...');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    handleInstallation();
  }, []);

  function getQueryParam(param: string): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
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

  async function handleInstallation(): Promise<void> {
    const code = getQueryParam('code');
    const returnUrl = getQueryParam('returnUrl');

    console.log('🥔 InstaPotat: Starting no-auth installation');
    console.log('📝 Code:', code ? 'present' : 'missing');
    console.log('🔗 ReturnUrl:', returnUrl);

    // Validate required parameters
    if (!code) {
      setStatusMessage('🚨 Missing authorization code. Installation failed.');
      setIsProcessing(false);
      console.error('❌ No authorization code provided');
      return;
    }

    if (!returnUrl) {
      setStatusMessage('🚨 Missing return URL. Installation failed.');
      setIsProcessing(false);
      console.error('❌ No return URL provided');
      return;
    }

    try {
      // Step 1: Exchange code for token
      setStatusMessage('🔄 Exchanging code for access token...');

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

      if (!data.access_token) {
        throw new Error('No access token received from HubSpot');
      }

      console.log('✅ Successfully received access token');

      // Step 2: Get account info
      setStatusMessage('📋 Fetching account information...');
      const accountData = await fetchAccountInfo(data.access_token);

      if (!accountData.portalId) {
        throw new Error('No portal ID found in account data');
      }

      console.log('✅ Portal ID:', accountData.portalId);

      // Step 3: Store token in localStorage (no database for InstaPotat)
      localStorage.setItem('instapotat_access_token', data.access_token);
      localStorage.setItem('instapotat_portal_id', accountData.portalId);

      console.log('💾 Token stored in localStorage');

      // Step 4: Success! Redirect after brief delay
      setStatusMessage(`🎉 InstaPotat installed successfully for Portal ${accountData.portalId}!`);
      setIsProcessing(false);

      console.log('🚀 Redirecting to:', returnUrl);

      // Give user time to see success message
      setTimeout(() => {
        setStatusMessage('🌟 Redirecting you now...');
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 500);
      }, 1500);

    } catch (error) {
      console.error('❌ Installation failed:', error);
      setStatusMessage(`🍠 Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }

  return (
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
      </div>
    </div>
  );
}

export default InstaPotatOAuthPage;

