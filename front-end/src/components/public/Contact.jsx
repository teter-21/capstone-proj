import "../../css/Contact.css";

function Contact() {
  return (
    <section id="contact" className="contact">
      <span className="section-title">VISIT OUR CLINIC</span>

      <p>Magno Dental Clinic</p>

      <p>Parañaque City</p>

      <p>09123456789</p>

      <br />

      <iframe
        title="Clinic Location"
        src="https://www.google.com/maps?q=Parañaque%20City&output=embed"
        loading="lazy"
      ></iframe>
    </section>
  );
}

export default Contact;
