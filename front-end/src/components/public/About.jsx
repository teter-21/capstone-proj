import "../../css/About.css";
import clinicImage from "../../assets/images/dental-bg.png";
import { FaUserMd, FaSmile, FaTooth } from "react-icons/fa";

function About() {
  return (
    <section id="about" className="about">
      <div className="about-image">
        <img src={clinicImage} alt="Magno Dental Clinic" />
      </div>

      <div className="about-content">
        <span className="section-title">ABOUT US</span>

        <h2>
          Caring for Your Smile,
          <br />
          Caring for You
        </h2>

        <p>
          Magno Dental Clinic is committed to providing gentle, high-quality,
          and affordable dental care for every patient. We combine modern
          technology with compassionate service to ensure a comfortable and
          positive dental experience.
        </p>

        <div className="about-features">
          <div className="feature-box">
            <FaUserMd />
            <span>Experienced Dentist</span>
          </div>

          <div className="feature-box">
            <FaSmile />
            <span>Friendly Service</span>
          </div>

          <div className="feature-box">
            <FaTooth />
            <span>Modern Equipment</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
