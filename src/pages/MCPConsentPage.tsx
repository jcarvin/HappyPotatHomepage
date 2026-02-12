import React, { useEffect, useState } from 'react';

interface ConsentPageProps {}

export function MCPConsentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    // Parse OAuth parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    setParams(urlParams);

    // Validate required parameters
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    const responseType = urlParams.get('response_type');

    if (!clientId || !redirectUri || !responseType) {
      setError('Missing required OAuth parameters');
    }
  }, []);

  const handleApprove = async () => {
    if (!params) return;

    setLoading(true);
    setError(null);

    try {
      // Build the authorization URL with all parameters
      const authUrl = new URL('/api/oauth/authorize', window.location.origin);
      
      // Copy all query parameters to the API endpoint
      params.forEach((value, key) => {
        authUrl.searchParams.set(key, value);
      });

      console.log('🚀 Redirecting to authorize endpoint:', authUrl.toString());

      // Redirect to the API endpoint which will generate code and redirect to HubSpot
      window.location.href = authUrl.toString();
      
    } catch (err) {
      console.error('Authorization error:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setLoading(false);
    }
  };

  const handleDeny = () => {
    // Close the popup without authorizing
    window.close();
  };

  const scope = params?.get('scope') || 'crm:read crm:write';
  const scopes = scope.split(' ');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* App Icon and Title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            🥔
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Connect Loaded Potat MCP
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666'
          }}>
            CRM Assistant for Breeze
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#c00',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {!error && (
          <>
            {/* Permissions */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                This will allow Loaded Potat to:
              </h2>
              <ul style={{
                margin: 0,
                padding: '0 0 0 20px',
                listStyle: 'none'
              }}>
                {scopes.includes('crm:read') && (
                  <li style={{
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ color: '#10b981', marginRight: '8px', fontSize: '18px' }}>✓</span>
                    <span>View your contacts, companies, and deals</span>
                  </li>
                )}
                {scopes.includes('crm:write') && (
                  <li style={{
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ color: '#10b981', marginRight: '8px', fontSize: '18px' }}>✓</span>
                    <span>Create and update contacts, companies, and deals</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Info Box */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              <strong>💡 What is this?</strong>
              <br />
              Loaded Potat MCP connects Breeze AI agents to your HubSpot CRM, 
              allowing them to help you manage contacts and deals through natural conversation.
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '30px'
            }}>
              <button
                onClick={handleDeny}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: '500',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6b7280',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading ? '#9333ea' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
              >
                {loading ? 'Connecting...' : 'Allow Access'}
              </button>
            </div>

            {/* Security note */}
            <p style={{
              marginTop: '20px',
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              🔒 Your data is secure. You can revoke access anytime from your HubSpot settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
