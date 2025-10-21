import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateApiToken, updateUsername } from '../lib/auth';
import Header from '../components/Header';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [newApiToken, setNewApiToken] = useState(user?.apiToken || '');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let hasError = false;

      // Update username if changed
      if (newUsername !== user?.username) {
        const { error } = await updateUsername(newUsername);
        if (error) {
          setMessage({ type: 'error', text: `Failed to update username: ${error}` });
          hasError = true;
        }
      }

      // Update API token if changed
      if (newApiToken !== user?.apiToken) {
        const { error } = await updateApiToken(newApiToken);
        if (error) {
          setMessage({ type: 'error', text: `Failed to update API token: ${error}` });
          hasError = true;
        }
      }

      if (!hasError) {
        await refreshUser();
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const cancelEdit = () => {
    setNewUsername(user?.username || '');
    setNewApiToken(user?.apiToken || '');
    setEditing(false);
    setMessage(null);
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="profile-page">
          <div className="profile-container">
            <p>Please log in to view your profile.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h1>Your Profile</h1>
            <button onClick={() => navigate('/')} className="back-button">
              ← Back to Home
            </button>
          </div>

          {!editing ? (
            <div className="profile-info">
              <div className="info-item">
                <label>Email</label>
                <p>{user.email}</p>
              </div>

              <div className="info-item">
                <label>Username</label>
                <p>{user.username}</p>
              </div>

              <div className="info-item">
                <label>API Token</label>
                <p className="api-token">{user.apiToken || 'Not set'}</p>
              </div>

              <div className="info-item">
                <label>User ID</label>
                <p className="user-id">{user.id}</p>
              </div>

              <div className="button-group">
                <button onClick={() => setEditing(true)} className="edit-button">
                  Edit Profile
                </button>
                <button onClick={handleSignOut} className="signout-button">
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="disabled-input"
                />
                <small>Email cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apiToken">API Token</label>
                <input
                  id="apiToken"
                  type="text"
                  value={newApiToken}
                  onChange={(e) => setNewApiToken(e.target.value)}
                  placeholder="Enter your API token"
                  disabled={loading}
                />
              </div>

              {message && (
                <div className={`alert alert-${message.type}`}>
                  {message.text}
                </div>
              )}

              <div className="button-group">
                <button type="submit" className="save-button" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="cancel-button"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

