import PublicNavbar from "../../components/public/PublicNavbar";
import Hero from "../../components/public/Hero";
import About from "../../components/public/About";
import Services from "../../components/public/Services";
import WhyChooseUs from "../../components/public/WhyChooseUs";
import Gallery from "../../components/public/Gallery";
import Contact from "../../components/public/Contact";
import Footer from "../../components/public/Footer";
import PatientReviews from "../../components/public/PatientReviews";

function Home() {
  return (
    <>
      <PublicNavbar />
      <Hero />
      <About />
      <Services />
      <WhyChooseUs />
      <PatientReviews />
      <Contact />
      <Footer />
    </>
  );
}

export default Home;
