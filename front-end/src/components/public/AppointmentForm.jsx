import API_BASE_URL from "../../config/apiBase.js";
import "../../css/Appointment.css";
import { useState } from "react";
import axios from "axios";
import { buildFullName } from "../../utils/nameFormatter";
import { FaShieldAlt } from "react-icons/fa";

function AppointmentForm() {
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    phone: "",
    preferred_date: "",
    preferred_time: "",
    service: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openTerms = () => {
    setShowTerms(true);
    setTermsRead(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert(
        "Please read and agree to the Terms and Conditions before booking.",
      );
      return;
    }

    setLoading(true);

    const fullname = buildFullName(
      formData.lastName,
      formData.firstName,
      formData.middleName,
    );

    try {
      const res = await axios.post(API_BASE_URL + "/appointment", {
        fullname,
        email: formData.email,
        phone: formData.phone,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        service: formData.service,
        reason: formData.reason,
      });

      alert(res.data.message);

      setFormData({
        lastName: "",
        firstName: "",
        middleName: "",
        email: "",
        phone: "",
        preferred_date: "",
        preferred_time: "",
        service: "",
        reason: "",
      });
      setTermsAccepted(false);
      setTermsRead(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Unable to submit appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="appointment">
      <div className="appointment-card">
        <h1>Book Appointment</h1>

        <p className="appointment-subtitle">
          Fill the form below to request your appointment.
        </p>

        <p className="appointment-description">
          Choose your preferred date, time, and dental service. Our clinic will
          review your request and email you once your appointment has been
          confirmed.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="name-row">
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="middleName"
              placeholder="Middle Name"
              value={formData.middleName}
              onChange={handleChange}
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <div className="schedule-row">
            <div>
              <label>Preferred Date</label>
              <input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                onChange={handleChange}
                min={today}
                required
              />
            </div>

            <div>
              <label>Preferred Time</label>
              <input
                type="time"
                name="preferred_time"
                value={formData.preferred_time}
                onChange={handleChange}
                min="08:00"
                max="18:00"
                required
              />
            </div>
          </div>

          <select
            name="service"
            value={formData.service}
            onChange={handleChange}
            required
          >
            <option value="">Select Service</option>
            <option value="Dental Check-up">Dental Check-up</option>
            <option value="Teeth Cleaning">Teeth Cleaning</option>
            <option value="Tooth Filling">Tooth Filling</option>
            <option value="Tooth Extraction">Tooth Extraction</option>
            <option value="Root Canal Treatment">Root Canal Treatment</option>
            <option value="Teeth Whitening">Teeth Whitening</option>
            <option value="Braces Consultation">Braces Consultation</option>
            <option value="Dental Crown">Dental Crown</option>
            <option value="Dental Bridge">Dental Bridge</option>
            <option value="Dentures">Dentures</option>
          </select>

          <textarea
            name="reason"
            rows="5"
            placeholder="Reason for Visit"
            value={formData.reason}
            onChange={handleChange}
          />

          <div className="appointment-terms">
            <label className="terms-check">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={!termsRead}
              />
              <span>
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="terms-link"
                  onClick={openTerms}
                >
                  Terms and Conditions
                </button>
                .
              </span>
            </label>

            {!termsRead && (
              <button
                type="button"
                className="read-terms-button"
                onClick={openTerms}
              >
                Read Terms and Conditions
              </button>
            )}
          </div>

          <button type="submit" disabled={loading || !termsAccepted}>
            {loading ? "Submitting..." : "Book Appointment"}
          </button>

          <div className="appointment-security">
            <FaShieldAlt className="security-icon" />
            <span>Your information is safe with us.</span>
          </div>
        </form>
      </div>

      {showTerms && (
        <div
          className="terms-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-terms-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowTerms(false);
          }}
        >
          <div className="terms-modal">
            <div className="terms-modal-header">
              <div>
                <h2 id="appointment-terms-title">Terms and Conditions</h2>
                <p>
                  Please read these terms before submitting your appointment
                  request.
                </p>
              </div>
              <button
                type="button"
                className="terms-close"
                aria-label="Close Terms and Conditions"
                onClick={() => setShowTerms(false)}
              >
                ×
              </button>
            </div>

            <div className="terms-content">
              <section>
                <h3>1. Appointment Request</h3>
                <p>
                  Submitting this form sends an appointment request to Magno
                  Dental Clinic. Your preferred date and time are not confirmed
                  until the clinic approves the request.
                </p>
              </section>

              <section>
                <h3>2. Accurate Information</h3>
                <p>
                  Please provide accurate and complete information. The clinic
                  may contact you using the email address or phone number you
                  provide.
                </p>
              </section>

              <section>
                <h3>3. Appointment Changes</h3>
                <p>
                  The clinic may contact you if your requested schedule is not
                  available or if the appointment needs to be changed. Please
                  wait for confirmation before considering the appointment
                  final.
                </p>
              </section>

              <section>
                <h3>4. Privacy</h3>
                <p>
                  Information submitted through this form is used to process
                  your appointment and provide clinic services. Please avoid
                  entering sensitive information that is not needed for your
                  appointment.
                </p>
              </section>

              <section>
                <h3>5. Agreement</h3>
                <p>
                  By checking the agreement box, you confirm that you have read
                  and understood these Terms and Conditions and agree to them
                  when submitting your appointment request.
                </p>
              </section>
            </div>

            <div className="terms-modal-footer">
              <button
                type="button"
                className="terms-agree-button"
                onClick={() => {
                  setTermsRead(true);
                  setTermsAccepted(true);
                  setShowTerms(false);
                }}
              >
                I Have Read and Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AppointmentForm;
