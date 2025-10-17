import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import './HubSpotDebugPage.css';

interface ApiResponse {
  endpoint: string;
  status: number;
  data: any;
  error?: string;
  timestamp: string;
}

function HubSpotDebugPage() {
  const { user } = useAuth();
  const [responses, setResponses] = useState<ApiResponse[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState('');

  const addResponse = (response: ApiResponse) => {
    setResponses((prev) => [response, ...prev]);
  };

  const makeApiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(endpoint);
    const timestamp = new Date().toISOString();

    try {
      // Get the user's Supabase session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        addResponse({
          endpoint,
          status: 0,
          data: null,
          error: 'Not authenticated. Please log in.',
          timestamp
        });
        setLoading(null);
        return;
      }

      // Call our proxy API endpoint
      const response = await fetch('/api/hubspot-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          endpoint,
          method,
          body
        })
      });

      const data = await response.json();

      addResponse({
        endpoint,
        status: response.status,
        data,
        timestamp
      });
    } catch (error) {
      addResponse({
        endpoint,
        status: 0,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCustomRequest = () => {
    if (customEndpoint) {
      makeApiCall(customEndpoint);
    }
  };

  if (!user) {
    return (
      <div className="debug-page">
        <div className="debug-container">
          <h1>🔐 Authentication Required</h1>
          <p>Please log in to access the HubSpot API debug playground.</p>
          <a href="/login" className="btn">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="debug-page">
      <div className="debug-container">
        <header className="debug-header">
          <h1>🔍 HubSpot API Debug Playground</h1>
          <p>Explore HubSpot APIs with your stored access token</p>
          <p className="user-info">Logged in as: <strong>{user.username}</strong></p>
        </header>

        <div className="quick-actions">
          <h2>🚀 Quick Actions</h2>
          <div className="button-grid">
            <button
              onClick={() => makeApiCall('/oauth/v1/access-tokens/' + (user.apiToken || 'PLACEHOLDER'))}
              disabled={!user.apiToken || loading !== null}
              className="action-btn"
            >
              📋 Token Info
            </button>

            <button
              onClick={() => makeApiCall('/account-info/v3/api-usage/daily')}
              disabled={loading !== null}
              className="action-btn"
            >
              📊 API Usage
            </button>

            <button
              onClick={() => makeApiCall('/crm/v3/objects/contacts?limit=5')}
              disabled={loading !== null}
              className="action-btn"
            >
              👥 List Contacts (5)
            </button>

            <button
              onClick={() => makeApiCall('/crm/v3/objects/companies?limit=5')}
              disabled={loading !== null}
              className="action-btn"
            >
              🏢 List Companies (5)
            </button>

            <button
              onClick={() => makeApiCall('/crm/v3/objects/deals?limit=5')}
              disabled={loading !== null}
              className="action-btn"
            >
              💰 List Deals (5)
            </button>

            <button
              onClick={() => makeApiCall('/settings/v3/users')}
              disabled={loading !== null}
              className="action-btn"
            >
              👤 List Users
            </button>

            <button
              onClick={() => makeApiCall('/crm/v3/properties/contacts')}
              disabled={loading !== null}
              className="action-btn"
            >
              🏷️ Contact Properties
            </button>

            <button
              onClick={() => makeApiCall('/crm/v3/schemas')}
              disabled={loading !== null}
              className="action-btn"
            >
              📐 CRM Schemas
            </button>
          </div>

          <div className="custom-request">
            <h3>🛠️ Custom Request</h3>
            <div className="custom-input-group">
              <span className="endpoint-prefix">https://api.hubapi.com</span>
              <input
                type="text"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="/your/endpoint/here"
                className="custom-input"
                disabled={loading !== null}
              />
              <button
                onClick={handleCustomRequest}
                disabled={!customEndpoint || loading !== null}
                className="custom-btn"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="loading-indicator">
            🔄 Loading {loading}...
          </div>
        )}

        <div className="responses-section">
          <div className="responses-header">
            <h2>📨 Responses ({responses.length})</h2>
            {responses.length > 0 && (
              <button
                onClick={() => setResponses([])}
                className="clear-btn"
              >
                Clear All
              </button>
            )}
          </div>

          {responses.length === 0 ? (
            <div className="empty-state">
              <p>No requests yet. Try one of the quick actions above!</p>
            </div>
          ) : (
            <div className="responses-list">
              {responses.map((response, index) => (
                <div key={index} className={`response-card ${response.error ? 'error' : 'success'}`}>
                  <div className="response-header">
                    <span className={`status-badge status-${Math.floor(response.status / 100)}`}>
                      {response.status || 'ERR'}
                    </span>
                    <span className="endpoint">{response.endpoint}</span>
                    <span className="timestamp">{new Date(response.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {response.error ? (
                    <div className="response-error">
                      <strong>Error:</strong> {response.error}
                    </div>
                  ) : (
                    <details className="response-details">
                      <summary>View Response Data</summary>
                      <pre className="response-json">
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HubSpotDebugPage;

