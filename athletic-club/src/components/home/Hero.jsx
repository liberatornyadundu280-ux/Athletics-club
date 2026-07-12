import Button from "../common/Button";
import { useNavigate } from "react-router-dom";
import BackgroundSlider from "./BackgroundSlider";
import JoinClubModal from "./JoinClubModal";
import useHiddenAdminTrigger from "../../hooks/useHiddenAdminTrigger";
import useJoinClubFlow from "../../hooks/useJoinClubFlow";

function Hero() {
  const navigate = useNavigate();
  const {
    isJoinModalOpen,
    joinError,
    openJoinModal,
    closeJoinModal,
    confirmStudent,
    rejectStudent,
  } = useJoinClubFlow();

  const adminTriggerProps = useHiddenAdminTrigger(() => {
    navigate("/dashboard");
  });

  return (
    <section className="hero-page home-hero" data-nav-section="home">
      <BackgroundSlider />
      <div className="hero-overlay">
        <p className="eyebrow">fitness center 🏃‍♂️‍➡️💨</p>
        <h1>
          <button
            className="admin-trigger"
            type="button"
            aria-label="Hidden admin trigger"
            {...adminTriggerProps}
          >
            A
          </button>
          ditya Athletics
        </h1>
        <p>
          Train with discipline, grow with the team, and discover the athletics
          community at Aditya Institutions.
        </p>
        <p>
          <strong>
            <i>...."Don't just wish for it work for it."</i>
          </strong>
        </p>
        <div className="hero-actions">
          <Button onClick={openJoinModal}>Join Club</Button>
          <Button to="/activities" variant="secondary">
            Explore Gallery
          </Button>
        </div>
      </div>

      <a
        className="hero-scroll-cue"
        href="#home-about-preview"
        aria-label="Scroll to page preview"
      >
        <span>Scroll</span>
        <i aria-hidden="true" />
      </a>

      <JoinClubModal
        error={joinError}
        isOpen={isJoinModalOpen}
        onClose={closeJoinModal}
        onConfirm={confirmStudent}
        onReject={rejectStudent}
      />
    </section>
  );
}

export default Hero;
