import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FaAddressBook,
  FaDumbbell,
  FaHome,
  FaImages,
  FaInfoCircle,
  FaUsers,
} from 'react-icons/fa';

const navItems = [
  { label: 'Home', path: '/', section: 'home', icon: FaHome },
  { label: 'Activities', path: '/activities', section: 'activities', icon: FaImages },
  { label: 'About', path: '/about', section: 'about', icon: FaInfoCircle },
  { label: 'Coaches', path: '/leaders', section: 'leaders', icon: FaUsers },
  { label: 'What We Do', path: '/what-we-do', section: 'what-we-do', icon: FaDumbbell },
  { label: 'Contact', path: '/contact', section: 'contact', icon: FaAddressBook },
];

function Navbar() {
  const { pathname } = useLocation();
  const [activeHomeSection, setActiveHomeSection] = useState('home');
  const isHomePage = pathname === '/';

  useEffect(() => {
    if (!isHomePage) {
      return undefined;
    }

    const sections = [...document.querySelectorAll('[data-nav-section]')];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveHomeSection(visibleEntry.target.dataset.navSection);
        }
      },
      {
        rootMargin: '-30% 0px -45% 0px',
        threshold: [0.1, 0.3, 0.55],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [isHomePage]);

  return (
    <header className="site-header">
      <NavLink className="brand" to="/" aria-label="Aditya Athletics home">
        <span className="brand-mark">AA</span>
        <span>Aditya Athletics</span>
      </NavLink>

      <nav className="nav-links" aria-label="Primary navigation">
        {navItems.map(({ label, path, section, icon: Icon }) => (
          <NavLink
            end={path === '/'}
            key={path}
            to={path}
            className={({ isActive }) => {
              const isScrollActive = isHomePage && activeHomeSection === section;
              return isActive || isScrollActive ? 'nav-link active' : 'nav-link';
            }}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Navbar;
