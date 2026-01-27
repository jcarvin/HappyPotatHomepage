import { useState } from 'react';
import './AuthCallbackTestPage.css';

function AuthCallbackTestPage() {
  const [messageSent, setMessageSent] = useState(false);
  const hasOpener = !!window.opener;

  function handleCompleteAuth() {
    if (window.opener) {
      // Send message to the opener window (the popup)
      window.opener.postMessage('auth_complete', '*');
      setMessageSent(true);

      // Optionally close this tab after a short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      alert('No opener window found. This page should be opened from the InstaPotat OAuth page.');
    }
  }

  function handleCompleteAuthAndClose() {
    if (window.opener) {
      window.opener.postMessage('auth_complete', '*');
      window.close();
    } else {
      alert('No opener window found. This page should be opened from the InstaPotat OAuth page.');
    }
  }

  return (
    <div className="auth-callback-page">
        <div className="callback-container">
          <div className="callback-icon">🔐</div>
          <h1 className="callback-title">Third-Party Auth Simulation</h1>
          <p className="callback-subtitle">
            This page simulates a third-party authentication callback (like QuickBooks, Google, etc.)
          </p>

          <div className="status-box">
            <div className="status-item">
              <span className="status-label">Opener Window:</span>
              <span className={`status-value ${hasOpener ? 'success' : 'error'}`}>
                {hasOpener ? '✅ Found' : '❌ Not Found'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Message Status:</span>
              <span className={`status-value ${messageSent ? 'success' : 'pending'}`}>
                {messageSent ? '✅ Sent' : '⏳ Not Sent'}
              </span>
            </div>
          </div>

          {messageSent ? (
            <div className="success-message">
              <p>🎉 Message sent to opener window!</p>
              <p className="closing-note">This tab will close automatically...</p>
            </div>
          ) : (
            <div className="button-group">
              <button
                className="auth-button primary"
                onClick={handleCompleteAuth}
                disabled={!hasOpener}
              >
                Complete Auth & Return Focus
              </button>
              <button
                className="auth-button secondary"
                onClick={handleCompleteAuthAndClose}
                disabled={!hasOpener}
              >
                Complete Auth & Close Immediately
              </button>
            </div>
          )}

          <div className="info-section">
            <h3>How This Works</h3>
            <ol className="info-list">
              <li>This page was opened from a popup window</li>
              <li>When you click the button, it sends a <code>postMessage</code> to the opener</li>
              <li>The opener (popup) receives the message and calls <code>window.focus()</code></li>
              <li>The popup window should be brought to the foreground</li>
            </ol>
          </div>

          {!hasOpener && (
            <div className="warning-box">
              <p>⚠️ <strong>No opener window detected.</strong></p>
              <p>
                To test this properly, navigate to{' '}
                <code>/insta-potat/no-auth?testMode=true</code> and click the
                "Test Third-Party Auth Flow" button.
              </p>
            </div>
          )}
        </div>
    </div>
  );
}

export default AuthCallbackTestPage;
