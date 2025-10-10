
function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="highlight">Happy Potat :)</span>
          </h1>
          <p className="hero-subtitle">
            Your premier destination for all things potato-related! From spud consulting
            to tuber technology, we're here to make your business grow like a well-nurtured potato.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary">Get Started</button>
            <button className="btn btn-secondary">Learn More</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="potato-illustration">
            <span className="potato-emoji">🥔</span>
            <div className="potato-eyes">
              <span className="eye">😊</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
