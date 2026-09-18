import "../../css/Gallery.css";
import dentalClinicImage from "../../assets/images/dental-clinic.png";

function Gallery() {
  return (
    <section className="gallery">
      <span className="section-title">OUR CLINIC</span>

      <div className="gallery-grid">
        <img src={dentalClinicImage} alt="Clinic" />

        <img src={dentalClinicImage} alt="Clinic" />

        <img src={dentalClinicImage} alt="Clinic" />

        <img src={dentalClinicImage} alt="Clinic" />
      </div>
    </section>
  );
}

export default Gallery;
