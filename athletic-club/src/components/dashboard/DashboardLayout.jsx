import { useState } from 'react';
import BackgroundManager from './BackgroundManager';
import GalleryManager from './GalleryManager';
import LeaderManager from './LeaderManager';
import Overview from './Overview';
import UploadImage from './UploadImage';

const tabs = ['Overview', 'Gallery Manager', 'Home Background Manager', 'Leader Manager', 'Upload Image'];

function DashboardLayout({
  backgroundItems,
  galleryItems,
  leaderItems,
  latestImage,
  onDeleteBackground,
  onDeleteGalleryItem,
  onLogout,
  onUpdateGalleryItem,
  onUpdateLeaderItem,
  onUpload,
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Content Management Dashboard</h1>
          <p>Manage gallery images, home backgrounds, captions, and categories.</p>
        </div>
        <button className="button button-danger" onClick={onLogout} type="button">
          Logout
        </button>
      </header>

      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab ? 'dashboard-tab dashboard-tab-active' : 'dashboard-tab'}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Overview' ? (
        <Overview backgroundItems={backgroundItems} galleryItems={galleryItems} latestImage={latestImage} />
      ) : null}
      {activeTab === 'Gallery Manager' ? (
        <GalleryManager
          galleryItems={galleryItems}
          onDelete={onDeleteGalleryItem}
          onUpdate={onUpdateGalleryItem}
        />
      ) : null}
      {activeTab === 'Home Background Manager' ? (
        <BackgroundManager backgroundItems={backgroundItems} onDelete={onDeleteBackground} />
      ) : null}
      {activeTab === 'Leader Manager' ? (
        <LeaderManager leaders={leaderItems} onUpdate={onUpdateLeaderItem} />
      ) : null}
      {activeTab === 'Upload Image' ? <UploadImage onUpload={onUpload} /> : null}
    </section>
  );
}

export default DashboardLayout;
