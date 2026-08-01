import { Link, Outlet, useLocation } from 'react-router-dom';
import { FaUserShield } from 'react-icons/fa';
import Footer from './Footer';
import Navbar from './Navbar';

function PageLayout() {
  const { pathname } = useLocation();
  const isHomePage = pathname === '/';

  return (
    <div className="site-shell">
      <Link className="admin-login-link" to="/dashboard">
        <FaUserShield aria-hidden="true" />
        <span>Admin Login</span>
      </Link>
      <Navbar />
      <main className={isHomePage ? 'site-main site-main-home' : 'site-main site-main-gradient'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PageLayout;
