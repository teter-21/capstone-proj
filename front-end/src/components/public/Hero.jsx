import { Link } from "react-router-dom";
import { FaBook, FaSignInAlt } from "react-icons/fa";
import "../../css/Hero.css";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-overlay">
        <div className="hero-content">
          <h3>Your Smile, Our Priority</h3>

          <h1>
            Your Trusted <br></br>Dental Care Partner
          </h1>

          <p>
            Providing quality dental care with modern technology, personalized
            treatment, and a comfortable environment for every patient.
          </p>

          <div className="hero-buttons">
            <Link to="/appointment" className="btn-primary">
              Book Appointment
            </Link>

            <Link to="/login" className="btn-secondary">
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
