import { useNavigate } from "react-router-dom";
import AppointmentForm from "../../components/public/AppointmentForm";

function BookAppointment() {
  const navigate = useNavigate();

  return (
    <>
      <div className="book-appointment-back-wrapper">
        <button
          type="button"
          className="book-appointment-back-button"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>
      <AppointmentForm />
    </>
  );
}

export default BookAppointment;
