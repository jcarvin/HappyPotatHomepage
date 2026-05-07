import { useState } from 'react';
import type { FormEvent } from 'react';

const LOCAL_DEV_STORAGE_KEY = 'happyPotat_useLocalDev';
const SLUG_STORAGE_KEY = 'happyPotat_marketplaceSlug';
const DEFAULT_SLUG = 'potat';

const buildIframePath = (slug: string) =>
  `/marketplace-external-review-public/sign-in/${encodeURIComponent(slug)}?_externalReviewDebug=true`;

function HubSpotApp() {
  const [isLocalDev, setIsLocalDev] = useState(
    () => localStorage.getItem(LOCAL_DEV_STORAGE_KEY) === 'true'
  );
  const [loadedSlug, setLoadedSlug] = useState(
    () => localStorage.getItem(SLUG_STORAGE_KEY) || DEFAULT_SLUG
  );
  const [slugInput, setSlugInput] = useState(loadedSlug);

  const handleToggleLocalDev = () => {
    const next = !isLocalDev;
    if (next) {
      localStorage.setItem(LOCAL_DEV_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_DEV_STORAGE_KEY);
    }
    setIsLocalDev(next);
  };

  const handleLoadSlug = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = slugInput.trim();
    if (!trimmed || trimmed === loadedSlug) return;
    localStorage.setItem(SLUG_STORAGE_KEY, trimmed);
    setLoadedSlug(trimmed);
  };

  const hostname = isLocalDev ? 'local' : 'app';
  const iframeSrc = `https://${hostname}.hubspotqa.com${buildIframePath(loadedSlug)}`;
  const isDirty = slugInput.trim() !== loadedSlug && slugInput.trim().length > 0;

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
              <h3>Marketplace Review Flow</h3>
              <p>Load the HubSpot Marketplace external review flow for any app slug.</p>
            </div>

            <form className="slug-loader" onSubmit={handleLoadSlug}>
              <label className="slug-loader-label" htmlFor="marketplace-slug-input">
                Marketplace QA app slug
              </label>
              <div className="slug-loader-controls">
                <span className="slug-loader-prefix">/sign-in/</span>
                <input
                  id="marketplace-slug-input"
                  type="text"
                  className="slug-loader-input"
                  value={slugInput}
                  onChange={(event) => setSlugInput(event.target.value)}
                  placeholder="potat"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  type="submit"
                  className="slug-loader-button"
                  disabled={!isDirty}
                >
                  Load
                </button>
              </div>
              <p className="slug-loader-hint">
                Currently loaded: <code>{loadedSlug}</code>
                {' · '}
                <code>?_externalReviewDebug=true</code> is always appended. This UI is relegated to QA only.
              </p>
            </form>

            <div className="review-iframe-wrapper">
              <iframe
                key={iframeSrc}
                src={iframeSrc}
                title={`HubSpot Marketplace review flow for ${loadedSlug}`}
                className="review-iframe"
                height={600}
              />
            </div>
            <div className="local-dev-toggle">
              <label className="local-dev-label">
                <input
                  type="checkbox"
                  checked={isLocalDev}
                  onChange={handleToggleLocalDev}
                />
                Use local dev (<code>{hostname}.hubspotqa.com</code>)
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HubSpotApp;
