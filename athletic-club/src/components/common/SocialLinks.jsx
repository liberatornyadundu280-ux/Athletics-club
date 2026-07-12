import { useEffect, useState } from "react";
import {
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { readSocialLinks } from "../../services/contentStorage";

const iconMap = {
  Instagram: FaInstagram,
  Facebook: FaFacebookF,
  LinkedIn: FaLinkedinIn,
  YouTube: FaYoutube,
  "Twitter/X": FaXTwitter,
  Email: FaEnvelope,
  WhatsApp: FaWhatsapp,
};

function SocialLinks({ compact = false }) {
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadLinks() {
      const links = await readSocialLinks();
      if (!ignore) {
        setSocialLinks(links);
      }
    }

    loadLinks();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div
      className={compact ? "social-links social-links-compact" : "social-links"}
    >
      {socialLinks.map((link) => {
        const Icon = iconMap[link.label];

        if (!Icon) {
          return null;
        }

        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
          >
            <Icon aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export default SocialLinks;
