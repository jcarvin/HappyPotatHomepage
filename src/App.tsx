import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import HubSpotApp from './components/HubSpotApp';
import Footer from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import OAuthPage from './pages/OAuthPage';
import AugratinOAuthSkipHsAuthPage from './pages/AugratinOAuthSkipHsAuthPage';
import AugratinOAuthWithHsAuthPage from './pages/AugratinOAuthWithHsAuthPage';
import InstaPotatOAuthPage from './pages/InstaPotatOAuthPage';
import LoadedPotatOAuthPage from './pages/LoadedPotatOAuthPage';
import LoadedPotatMCPPage from './pages/LoadedPotatMCPPage';
import TaterOAuthPage from './pages/TaterOAuthPage';
import { MCPConsentPage } from './pages/MCPConsentPage';
import HubSpotDebugPage from './pages/HubSpotDebugPage';
import AuthCallbackTestPage from './pages/AuthCallbackTestPage';
import { useAuth } from './hooks/useAuth';
import './App.css';

function HomePage() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <Services />
        <HubSpotApp />
      </main>
      <Footer />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-potato">🥔</div>
        <p className="loading-text">Loading Happy Potat...</p>
      </div>
    </div>
  );
}

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/oauth" element={<OAuthPage />} />
      <Route path="/augratin-oauth/skip-hs-auth" element={<AugratinOAuthSkipHsAuthPage />} />
      <Route path="/augratin-oauth/with-hs-auth" element={<AugratinOAuthWithHsAuthPage />} />
      <Route path="/insta-potat/no-auth" element={<InstaPotatOAuthPage />} />
      <Route path="/loaded-potat-oauth" element={<LoadedPotatOAuthPage />} />
      <Route path="/loaded-potat-mcp" element={<LoadedPotatMCPPage />} />
      <Route path="/tater-oauth" element={<TaterOAuthPage />} />
      <Route path="/mcp-consent" element={<MCPConsentPage />} />
      <Route path="/debug/hubspot" element={<HubSpotDebugPage />} />
      <Route path="/auth-callback-test" element={<AuthCallbackTestPage />} />
    </Routes>
  );
}

export default App;
