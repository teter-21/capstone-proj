import "../../css/Services.css";

import TeethCleaning from "../../assets/images/serv-cleaning.png";
import ToothFilling from "../../assets/images/serv-filling.png";
import ToothExtraction from "../../assets/images/serv-extraction.png";
import TeethWhitening from "../../assets/images/serv-whitening.png";
import DentalCheckup from "../../assets/images/serv-checkup.png";
import MoreServices from "../../assets/images/serv-more.png";

function Services() {
  const services = [
    {
      icon: <img src={DentalCheckup} alt="Dental Check-up" />,
      title: "Dental Check-up",
      desc: "A routine examination to assess the health of your teeth, gums, and mouth and detect any dental problems early.",
    },

    {
      icon: <img src={TeethCleaning} alt="Teeth Cleaning" />,
      title: "Teeth Cleaning",
      desc: "A professional procedure that removes plaque, tartar, and stains to keep your teeth and gums healthy..",
    },

    {
      icon: <img src={ToothFilling} alt="Tooth Filling" />,
      title: "Tooth Filling",
      desc: "A treatment that restores a tooth damaged by decay by filling the cavity with a durable materia",
    },

    {
      icon: <img src={ToothExtraction} alt="Tooth Extraction" />,
      title: "Tooth Extraction",
      desc: "The removal of a tooth that is severely damaged, decayed, or causing dental problems.",
    },

    {
      icon: <img src={TeethWhitening} alt="Teeth Whitening" />,
      title: "Teeth Whitening",
      desc: "A cosmetic treatment that lightens the color of teeth by removing stains and discoloration.",
    },
    {
      icon: <img src={MoreServices} alt="More Services" />,
      title: "And More",
      desc: "We also offer a variety of other dental services tailored to meet your oral health and smile enhancement needs.",
    },
  ];

  return (
    <section id="services" className="services">
      <span className="section-title">OUR SERVICES</span>

      <h2>Quality Dental Care for Everyone</h2>

      <div className="service-grid">
        {services.map((service, index) => (
          <div className="service-card" key={index}>
            <div className="service-icon">{service.icon}</div>

            <h3>{service.title}</h3>

            <p>{service.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Services;
