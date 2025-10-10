
function HubSpotApp() {
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

            {/* This is where you'll embed your external review components */}
            <div className="review-component-container">
              <div className="placeholder-review-component">
                <div className="placeholder-content">
                  <h4>🔧 Review Component Testing Area</h4>
                  <p>This is where your external HubSpot review components will be embedded and tested.</p>
                  <div className="placeholder-features">
                    <span className="placeholder-feature">⭐ Review Collection</span>
                    <span className="placeholder-feature">📝 Review Display</span>
                    <span className="placeholder-feature">📊 Review Analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HubSpotApp;
