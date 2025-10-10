
function Services() {
  const services = [
    {
      icon: '🌱',
      title: 'Potato Growth Consulting',
      description: 'Expert advice on cultivating the perfect potato crop for your business needs.'
    },
    {
      icon: '🍟',
      title: 'Spud Processing Solutions',
      description: 'Advanced potato processing technology to maximize your tuber potential.'
    },
    {
      icon: '📊',
      title: 'Tuber Analytics',
      description: 'Data-driven insights to optimize your potato operations and yield.'
    },
    {
      icon: '🚀',
      title: 'Innovation Lab',
      description: 'Cutting-edge research and development in potato-based technologies.'
    }
  ];

  return (
    <section id="services" className="services">
      <div className="services-container">
        <h2 className="section-title">Our Services</h2>
        <p className="section-subtitle">
          We offer comprehensive potato solutions to help your business thrive
        </p>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;
