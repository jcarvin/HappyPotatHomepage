/**
 * Loaded Potat MCP Dashboard
 * 
 * Shows the status of:
 * 1. App installation (HubSpot → Your API)
 * 2. MCP server configuration
 * 3. Available tools
 * 4. Connection instructions for Breeze Studio
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface AppStatus {
  installed: boolean;
  hasTokens: boolean;
  tokenExpiry?: string;
}

function LoadedPotatMCPPage() {
  const { user, loading: authLoading } = useAuth();
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAppStatus();
    }
  }, [user]);

  const checkAppStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if app tokens exist
      const { data, error: queryError } = await supabase
        .from('app_tokens')
        .select('access_token, access_token_expires_at')
        .eq('app_name', 'loadedpotat')
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // No tokens found
          setAppStatus({
            installed: false,
            hasTokens: false,
          });
        } else {
          throw queryError;
        }
      } else {
        setAppStatus({
          installed: true,
          hasTokens: !!data.access_token,
          tokenExpiry: data.access_token_expires_at,
        });
      }
    } catch (err) {
      console.error('Failed to check app status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mcp-dashboard">
        <h1>🥔 Loaded Potat MCP Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mcp-dashboard">
        <h1>🥔 Loaded Potat MCP Dashboard</h1>
        <p>Please log in to view the dashboard.</p>
        <button onClick={() => (window.location.href = '/loaded-potat-oauth')}>
          Go to Login
        </button>
      </div>
    );
  }

  const mcpServerUrl = window.location.origin + '/api/mcp/handler';
  const oauthAuthorizeUrl = window.location.origin + '/api/oauth/authorize';
  const oauthTokenUrl = window.location.origin + '/api/oauth/token';

  return (
    <div className="mcp-dashboard">
      <div className="dashboard-header">
        <h1>🥔 Loaded Potat MCP Dashboard</h1>
        <p>Model Context Protocol Server for HubSpot Breeze Agents</p>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* App Installation Status */}
      <div className="status-section">
        <h2>📦 App Installation Status</h2>
        {appStatus?.installed ? (
          <div className="status-card success">
            <div className="status-icon">✅</div>
            <div className="status-content">
              <h3>Installed</h3>
              <p>Loaded Potat app is connected to HubSpot</p>
              {appStatus.tokenExpiry && (
                <p className="token-expiry">
                  Token expires: {new Date(appStatus.tokenExpiry).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="status-card warning">
            <div className="status-icon">⚠️</div>
            <div className="status-content">
              <h3>Not Installed</h3>
              <p>You need to install the Loaded Potat app first</p>
              <button
                onClick={() => (window.location.href = '/loaded-potat-oauth')}
                className="install-button"
              >
                Install App
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MCP Server Info */}
      <div className="mcp-section">
        <h2>🔧 MCP Server Configuration</h2>
        <div className="config-card">
          <div className="config-item">
            <label>MCP Server URL:</label>
            <code className="url-display">{mcpServerUrl}</code>
            <button
              onClick={() => navigator.clipboard.writeText(mcpServerUrl)}
              className="copy-button"
            >
              📋 Copy
            </button>
          </div>

          <div className="config-item">
            <label>OAuth Authorization URL:</label>
            <code className="url-display">{oauthAuthorizeUrl}</code>
            <button
              onClick={() => navigator.clipboard.writeText(oauthAuthorizeUrl)}
              className="copy-button"
            >
              📋 Copy
            </button>
          </div>

          <div className="config-item">
            <label>OAuth Token URL:</label>
            <code className="url-display">{oauthTokenUrl}</code>
            <button
              onClick={() => navigator.clipboard.writeText(oauthTokenUrl)}
              className="copy-button"
            >
              📋 Copy
            </button>
          </div>

          <div className="config-item">
            <label>Client ID:</label>
            <code>loadedpotat-mcp</code>
          </div>
        </div>
      </div>

      {/* Available Tools */}
      <div className="tools-section">
        <h2>🛠️ Available MCP Tools</h2>
        <div className="tools-grid">
          <div className="tool-card">
            <h3>👤 Contact Tools</h3>
            <ul>
              <li><code>create_contact</code> - Create a new contact</li>
              <li><code>update_contact</code> - Update existing contact</li>
              <li><code>get_contact</code> - Retrieve contact by ID</li>
              <li><code>search_contacts</code> - Search for contacts</li>
              <li><code>list_contact_properties</code> - List available properties</li>
            </ul>
          </div>

          <div className="tool-card">
            <h3>💼 Deal Tools</h3>
            <ul>
              <li><code>create_deal</code> - Create a new deal</li>
              <li><code>update_deal</code> - Update existing deal</li>
              <li><code>get_deal</code> - Retrieve deal by ID</li>
              <li><code>search_deals</code> - Search for deals</li>
              <li><code>associate_contact_deal</code> - Link contact to deal</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connection Instructions */}
      <div className="instructions-section">
        <h2>📖 How to Connect in Breeze Studio</h2>
        <ol className="instruction-list">
          <li>
            <strong>Open Breeze Agent Studio</strong> in your HubSpot account
          </li>
          <li>
            <strong>Create or edit an agent</strong>
          </li>
          <li>
            <strong>Add tool → MCP Servers → Connect and add</strong>
          </li>
          <li>
            <strong>Enter the configuration:</strong>
            <ul>
              <li>Server URL: <code>{mcpServerUrl}</code></li>
              <li>OAuth Authorization: <code>{oauthAuthorizeUrl}</code></li>
              <li>OAuth Token: <code>{oauthTokenUrl}</code></li>
              <li>Client ID: <code>loadedpotat-mcp</code></li>
            </ul>
          </li>
          <li>
            <strong>Complete OAuth flow</strong> when prompted
          </li>
          <li>
            <strong>Start using tools</strong> in your Breeze agent!
          </li>
        </ol>

        <div className="note-box">
          <strong>⚠️ Note:</strong> The MCP connection is separate from the app installation.
          Each HubSpot user needs to connect the MCP server individually in Breeze Studio.
        </div>
      </div>

      {/* Debug Section */}
      <div className="debug-section">
        <h2>🔍 Debug Information</h2>
        <details>
          <summary>View Technical Details</summary>
          <pre className="debug-info">
            {JSON.stringify(
              {
                user_id: user.id,
                app_installed: appStatus?.installed,
                has_tokens: appStatus?.hasTokens,
                mcp_server: mcpServerUrl,
                oauth_endpoints: {
                  authorize: oauthAuthorizeUrl,
                  token: oauthTokenUrl,
                },
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>

      <style>{`
        .mcp-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .dashboard-header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
        }

        .error-banner {
          background: #fee;
          border: 2px solid #fcc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .status-section,
        .mcp-section,
        .tools-section,
        .instructions-section,
        .debug-section {
          margin-bottom: 40px;
        }

        .status-card,
        .config-card,
        .tool-card {
          background: #f9f9f9;
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .status-card {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .status-card.success {
          border-color: #4caf50;
          background: #f1f8f4;
        }

        .status-card.warning {
          border-color: #ff9800;
          background: #fff8e1;
        }

        .status-icon {
          font-size: 3em;
        }

        .status-content h3 {
          margin: 0 0 10px 0;
        }

        .config-item {
          margin-bottom: 20px;
        }

        .config-item label {
          display: block;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .url-display {
          display: block;
          background: white;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: monospace;
          word-break: break-all;
          margin-bottom: 5px;
        }

        .copy-button {
          padding: 5px 10px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .copy-button:hover {
          background: #1976d2;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .tool-card h3 {
          margin-top: 0;
        }

        .tool-card ul {
          list-style: none;
          padding: 0;
        }

        .tool-card li {
          margin-bottom: 10px;
          padding-left: 20px;
          position: relative;
        }

        .tool-card li:before {
          content: "▸";
          position: absolute;
          left: 0;
        }

        .instruction-list {
          line-height: 1.8;
        }

        .instruction-list code {
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .note-box {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }

        .debug-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
        }

        .install-button {
          margin-top: 10px;
          padding: 10px 20px;
          background: #8b4513;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1em;
        }

        .install-button:hover {
          background: #a0522d;
        }
      `}</style>
    </div>
  );
}

export default LoadedPotatMCPPage;
