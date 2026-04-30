import { useState } from 'react';

const LOCAL_DEV_STORAGE_KEY = 'happyPotat_useLocalDev';
const IFRAME_PATH = '/marketplace-external-review-public/sign-in/potat?_externalReviewDebug=true';

function HubSpotApp() {
  const [isLocalDev, setIsLocalDev] = useState(
    () => localStorage.getItem(LOCAL_DEV_STORAGE_KEY) === 'true'
  );

  const handleToggleLocalDev = () => {
    const next = !isLocalDev;
    if (next) {
      localStorage.setItem(LOCAL_DEV_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_DEV_STORAGE_KEY);
    }
    setIsLocalDev(next);
  };

  const iframeSrc = `https://${isLocalDev ? 'local' : 'app'}.hubspotqa.com${IFRAME_PATH}`;

  return (
    <section id="hubspot-app" className="hubspot-app">
      <div className="hubspot-app-container">
        <div className="hubspot-app-header">
          <h2 className="section-title">HubSpot Integration</h2>
          <p className="section-subtitle">
            Experience the power of our HubSpot app designed specifically for potato businesses
          </p>
        </div>

        <div className="hubspot-app-content">
          <div className="app-features">
            <div className="feature">
              <span className="feature-icon">📈</span>
              <h3>Potato CRM</h3>
              <p>Manage your potato customers and leads with our specialized CRM system</p>
            </div>
            <div className="feature">
              <span className="feature-icon">📧</span>
              <h3>Spud Marketing</h3>
              <p>Automated marketing campaigns tailored for potato industry needs</p>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <h3>Analytics Dashboard</h3>
              <p>Track your potato business metrics with our comprehensive reporting tools</p>
            </div>
          </div>

          <div className="review-component-area">
            <div className="review-section-header">
              <h3>Customer Reviews</h3>
              <p>See what our customers are saying about Happy Potat :)</p>
            </div>

            <div className="placeholder-features">
              {/* testing iframe authentication */}
              <iframe src={iframeSrc} title="HubSpot OAuth Callback" style={{ width: '100%', minWidth: 480 }} height="600"></iframe>
            </div>
            <div className="local-dev-toggle">
              <label className="local-dev-label">
                <input
                  type="checkbox"
                  checked={isLocalDev}
                  onChange={handleToggleLocalDev}
                />
                Use local dev (<code>{isLocalDev ? 'local' : 'app'}.hubspotqa.com</code>)
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HubSpotApp;
