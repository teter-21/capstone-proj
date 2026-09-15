import "../../css/Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <p>
        © {new Date().getFullYear()} Magno Dental Clinic. All Rights Reserved.
      </p>
    </footer>
  );
}

export default Footer;
