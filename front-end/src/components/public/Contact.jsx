import "../../css/Contact.css";
import { FaLocationArrow, FaPhone, FaClock } from "react-icons/fa";

function Contact() {
  return (
    <section id="contact" className="contact">
      <span className="section-title">VISIT OUR CLINIC</span>

      <p>
        <FaLocationArrow /> St Francis, Parañaque, 1709 Metro Manila,
        Philippines
      </p>

      <p>
        <FaPhone /> 09176242664(Globe), 09102556888(Smart), 09915275675(Dito)
      </p>

      <div className="we_open">
        <p>
          <FaClock /> Monday to Friday
        </p>

        <p>10am-6pm</p>
      </div>

      <br />

      <iframe
        title="Clinic Location"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241.42967141856855!2d121.01439168018682!3d14.49187918252776!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397cef27670edbf%3A0x71db9c2f22e46422!2sMagno%20Dental%20Clinic!5e0!3m2!1sen!2sph!4v1790066953580!5m2!1sen!2sph"
        loading="lazy"
      ></iframe>
    </section>
  );
}

export default Contact;
