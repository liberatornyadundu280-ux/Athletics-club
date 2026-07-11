import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

function PageLayout() {
  const { pathname } = useLocation();
  const isHomePage = pathname === '/';

  return (
    <div className="site-shell">
      <Navbar />
      <main className={isHomePage ? 'site-main site-main-home' : 'site-main site-main-gradient'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PageLayout;
