import { useEffect, useState } from "react";
import AdminManager from "./AdminManager";
import BackgroundManager from "./BackgroundManager";
import GalleryManager from "./GalleryManager";
import LeaderManager from "./LeaderManager";
import Overview from "./Overview";
import SocialLinksManager from "./SocialLinksManager";
import UploadImage from "./UploadImage";

const tabs = [
  "Overview",
  "Gallery Manager",
  "Home Background Manager",
  "Leader Manager",
  "Social Links",
  "Admin Access",
  "Upload Image",
];

function DashboardLayout({
  adminEmails,
  backgroundItems,
  currentUserEmail,
  galleryItems,
  leaderItems,
  latestImage,
  onAddAdmin,
  onAddSocialLink,
  onDeleteBackground,
  onDeleteGalleryItem,
  onDeleteSocialLink,
  onLogout,
  onRemoveAdmin,
  onUpdateGalleryItem,
  onUpdateLeaderItem,
  onUpload,
  socialLinks,
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= 768;
      setIsMobile(nextIsMobile);

      if (!nextIsMobile) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTabSelect = (tab) => {
    setActiveTab(tab);

    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Content Management Dashboard</h1>
          <p>
            Manage gallery images, home backgrounds, captions, and categories.
          </p>
        </div>
        <button
          className="button button-danger"
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>
      </header>

      <div className="dashboard-tabs-shell">
        {isMobile ? (
          <button
            aria-controls="dashboard-tab-list"
            aria-expanded={mobileMenuOpen}
            className="dashboard-tabs-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
          >
            <span>{activeTab}</span>
            <span className="dashboard-tabs-toggle-icon">☰</span>
          </button>
        ) : null}

        <nav
          aria-label="Dashboard sections"
          className={`dashboard-tabs ${isMobile ? "dashboard-tabs-mobile" : ""} ${isMobile && mobileMenuOpen ? "dashboard-tabs-open" : ""}`}
          id="dashboard-tab-list"
        >
          {tabs.map((tab) => (
            <button
              className={
                activeTab === tab
                  ? "dashboard-tab dashboard-tab-active"
                  : "dashboard-tab"
              }
              key={tab}
              onClick={() => handleTabSelect(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Overview" ? (
        <Overview
          backgroundItems={backgroundItems}
          galleryItems={galleryItems}
          latestImage={latestImage}
        />
      ) : null}
      {activeTab === "Gallery Manager" ? (
        <GalleryManager
          galleryItems={galleryItems}
          onDelete={onDeleteGalleryItem}
          onUpdate={onUpdateGalleryItem}
        />
      ) : null}
      {activeTab === "Home Background Manager" ? (
        <BackgroundManager
          backgroundItems={backgroundItems}
          onDelete={onDeleteBackground}
        />
      ) : null}
      {activeTab === "Leader Manager" ? (
        <LeaderManager leaders={leaderItems} onUpdate={onUpdateLeaderItem} />
      ) : null}
      {activeTab === "Social Links" ? (
        <SocialLinksManager
          links={socialLinks}
          onAdd={onAddSocialLink}
          onDelete={onDeleteSocialLink}
        />
      ) : null}
      {activeTab === "Admin Access" ? (
        <AdminManager
          adminEmails={adminEmails}
          currentUserEmail={currentUserEmail}
          onAddAdmin={onAddAdmin}
          onRemoveAdmin={onRemoveAdmin}
        />
      ) : null}
      {activeTab === "Upload Image" ? (
        <UploadImage onUpload={onUpload} />
      ) : null}
    </section>
  );
}

export default DashboardLayout;
