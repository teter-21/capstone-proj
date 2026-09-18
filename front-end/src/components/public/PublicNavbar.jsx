import { useState } from "react";
import { Link } from "react-router-dom";
import { FaBars, FaBook, FaSignInAlt, FaTimes } from "react-icons/fa";
import logo from "../../assets/images/60x60modal-logo.png";
import "../../css/PublicNavbar.css";

function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="public-navbar">
      <div className="public-navbar-inner">
        <a
          href="#home"
          className="public-logo"
          onClick={closeMenu}
          aria-label="Magno Dental Clinic home"
        >
          <div className="logo-container">
            <img src={logo} alt="Magno Dental Clinic logo" />
          </div>
          <div className="logo-text">
            <h2>Magno</h2>
            <h3>Dental Clinic</h3>
          </div>
        </a>

        <button
          type="button"
          className="public-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <ul className={menuOpen ? "public-nav-menu open" : "public-nav-menu"}>
          <li>
            <a href="#home" onClick={closeMenu}>
              Home
            </a>
          </li>

          <li>
            <a href="#about" onClick={closeMenu}>
              About
            </a>
          </li>

          <li>
            <a href="#services" onClick={closeMenu}>
              Services
            </a>
          </li>

          <li>
            <a href="#reviews" onClick={closeMenu}>
              Reviews
            </a>
          </li>

          <li>
            <a href="#contact" onClick={closeMenu}>
              Contact
            </a>
          </li>

          <li>
            <Link
              to="/appointment"
              className="nav-action nav-book"
              onClick={closeMenu}
            >
              <FaBook />
            </Link>
          </li>
          <li>
            <Link
              to="/login"
              className="nav-action nav-login"
              onClick={closeMenu}
            >
              <FaSignInAlt />
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default PublicNavbar;
