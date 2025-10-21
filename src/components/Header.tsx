import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🥔</span>
          <span className="logo-text">Happy Potat :)</span>
        </Link>
        <nav className="nav">
          <Link to="/#home" className="nav-link">Home</Link>
          <Link to="/#services" className="nav-link">Services</Link>
          <Link to="/#hubspot-app" className="nav-link">HubSpot App</Link>
          <Link to="/#contact" className="nav-link">Contact</Link>

          {user ? (
            <>
              <Link to="/profile" className="nav-link nav-link-profile">
                👤 {user.username}
              </Link>
              <Link to="/debug/hubspot" className="nav-link nav-link-debug">
                🔍 API Debug
              </Link>
              <button onClick={handleSignOut} className="nav-link nav-button">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link nav-link-signin">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
