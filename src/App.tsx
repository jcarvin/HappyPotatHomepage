import Header from './components/Header';
import Hero from './components/Hero';
import Services from './components/Services';
import HubSpotApp from './components/HubSpotApp';
import Footer from './components/Footer';
import './App.css';

function App() {
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

export default App
