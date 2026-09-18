import React, { useEffect, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaQuoteLeft,
  FaStar,
} from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import api from "../../api";
import "../../css/PatientReviews.css";

const formatReviewerName = (name) => {
  const parts = String(name || "Patient")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

function Stars({ rating }) {
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          className={star <= Number(rating) ? "filled" : "empty"}
        />
      ))}
    </div>
  );
}

function PatientReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      try {
        const response = await api.get("/reviews");
        if (mounted)
          setReviews(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Homepage reviews error:", error);
        if (mounted) setReviews([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReviews();
    const refresh = () => loadReviews();
    window.addEventListener("clinic:data-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      mounted = false;
      window.removeEventListener("clinic:data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <section className="patient-reviews" id="reviews">
      <div className="patient-reviews-heading">
        <p className="reviews-eyebrow">PATIENT EXPERIENCES</p>
        <h2>What Our Patients Say</h2>
        <p>
          Real experiences from patients who have visited Magno Dental Clinic.
        </p>
      </div>

      {loading ? (
        <div className="reviews-empty">Loading patient reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="reviews-empty">
          <FaQuoteLeft />
          <p>Patient reviews will appear here!</p>
        </div>
      ) : (
        <div className="reviews-slider-wrap">
          <button
            className="reviews-nav reviews-prev"
            aria-label="Previous review"
          >
            <FaChevronLeft />
          </button>

          <Swiper
            modules={[Autoplay, Navigation, Pagination]}
            navigation={{ prevEl: ".reviews-prev", nextEl: ".reviews-next" }}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            loop={reviews.length > 2}
            spaceBetween={20}
            slidesPerView={1}
            breakpoints={{
              768: { slidesPerView: 2 },
              1100: { slidesPerView: 3 },
            }}
            className="patient-reviews-swiper"
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id}>
                <article className="review-card">
                  <Stars rating={review.rating} />
                  <p className="review-comment">“{review.comment}”</p>
                  <div className="review-author">
                    <div className="review-avatar">
                      {formatReviewerName(review.name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{formatReviewerName(review.name)}</strong>
                      <span>Verified Patient Review</span>
                    </div>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>

          <button className="reviews-nav reviews-next" aria-label="Next review">
            <FaChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}

export default PatientReviews;
