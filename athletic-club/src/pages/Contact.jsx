import Button from "../components/common/Button";
import SocialLinks from "../components/common/SocialLinks";
import { orgtreeLinks } from "../services/orgtreeLinks";

function Contact() {
  return (
    <section className="page-section contact-page">
      <div className="section-intro">
        <p className="eyebrow">Contact</p>
        <h1>Interested in athletics at Aditya?</h1>
        <p>
          Reach out to the club for training questions, activity updates,
          joining guidance, or general inquiries.
        </p>
      </div>

      <div className="contact-panel">
        <div>
          <h2>Quick communication</h2>
          <p>
            WhatsApp:{" "}
            <a
              className="whatsapp-link"
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
            >
              Message the club
            </a>
          </p>
          <p>Email: athletics@adityaInstitutions.in</p>
        </div>

        <div>
          <h2>Follow the club</h2>
          <SocialLinks />
        </div>

        <Button href={orgtreeLinks.joinClub}>Join Club</Button>
      </div>
    </section>
  );
}

export default Contact;
