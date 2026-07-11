import { Route, Routes } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Dashboard from '../pages/Dashboard';
import Gallery from '../pages/Gallery';
import Home from '../pages/Home';
import Leaders from '../pages/Leaders';
import NotFound from '../pages/NotFound';
import WhatWeDo from '../pages/WhatWeDo';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="leaders" element={<Leaders />} />
        <Route path="activities" element={<Gallery />} />
        <Route path="what-we-do" element={<WhatWeDo />} />
        <Route path="contact" element={<Contact />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
