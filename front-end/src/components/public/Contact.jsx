import "../../css/Contact.css";

function Contact() {
  return (
    <section id="contact" className="contact">
      <h2>Visit Our Clinic</h2>

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
