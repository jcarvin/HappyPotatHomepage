import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import HubSpotApp from './components/HubSpotApp';
import Footer from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import OAuthPage from './pages/OAuthPage';
import InstaPotatOAuthPage from './pages/InstaPotatOAuthPage';
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/oauth" element={<OAuthPage />} />
      <Route path="/insta-potat/no-auth" element={<InstaPotatOAuthPage />} />
    </Routes>
  );
}

export default App;
