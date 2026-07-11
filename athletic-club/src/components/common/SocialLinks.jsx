import { FaEnvelope, FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { socialLinks } from '../../data/socialLinks';

const iconMap = {
  Instagram: FaInstagram,
  Facebook: FaFacebookF,
  LinkedIn: FaLinkedinIn,
  YouTube: FaYoutube,
  'Twitter/X': FaXTwitter,
  Email: FaEnvelope,
  WhatsApp: FaWhatsapp,
};

function SocialLinks({ compact = false }) {
  return (
    <div className={compact ? 'social-links social-links-compact' : 'social-links'}>
      {socialLinks.map((link) => {
        const Icon = iconMap[link.label];

        return (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>
            <Icon aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export default SocialLinks;
