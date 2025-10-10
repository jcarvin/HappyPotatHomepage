
function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon">🥔</span>
              <span className="logo-text">Happy Potat :)</span>
            </div>
            <p className="footer-description">
              Making the world a better place, one potato at a time.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#press">Press</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Services</h4>
              <ul>
                <li><a href="#consulting">Consulting</a></li>
                <li><a href="#processing">Processing</a></li>
                <li><a href="#analytics">Analytics</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Contact</h4>
              <ul>
                <li>📧 hello@happypotat.com</li>
                <li>📞 1-800-POTATO-1</li>
                <li>📍 123 Spud Street, Potato Valley, PV 12345</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Happy Potat :) All rights reserved.</p>
          <div className="footer-social">
            <a href="#" aria-label="Twitter">🐦</a>
            <a href="#" aria-label="LinkedIn">💼</a>
            <a href="#" aria-label="Instagram">📷</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
