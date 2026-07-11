import SocialLinks from "../common/SocialLinks";

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Aditya Institutions Athletics Club</strong>
        <p>
          © 2026 Orgtree Systems. Built with React & systems-focused design.
        </p>
      </div>

      <div className="footer-actions">
        <SocialLinks />
        <a
          href="https://liber.getorgtree.com/"
          target="_blank"
          rel="noreferrer"
        >
          Website powered by Orgtree Systems
        </a>
      </div>
    </footer>
  );
}

export default Footer;
