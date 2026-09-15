import "../../css/WhyChooseUs.css";
import { FaUserMd, FaTooth, FaLaptopMedical, FaSmile } from "react-icons/fa";

function WhyChooseUs() {
  const features = [
    {
      icon: <FaUserMd />,
      title: "Experienced Dentist",
      description: "Professional dental care provided by a licensed dentist.",
    },
    {
      icon: <FaTooth />,
      title: "Complete Dental Services",
      description:
        "From regular check-ups to restorative and cosmetic treatments.",
    },
    {
      icon: <FaLaptopMedical />,
      title: "Digital Patient Records",
      description: "Fast, secure, and organized patient information.",
    },
    {
      icon: <FaSmile />,
      title: "Comfortable Environment",
      description: "Friendly staff and a relaxing clinic experience.",
    },
  ];

  return (
    <section className="why-us">
      <h2>Why Choose Magno Dental Clinic?</h2>

      <div className="why-grid">
        {features.map((item, index) => (
          <div className="why-card" key={index}>
            <div className="icon">{item.icon}</div>

            <h3>{item.title}</h3>

            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WhyChooseUs;
