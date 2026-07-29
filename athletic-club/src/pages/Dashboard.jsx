import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import LoginDialog from "../components/dashboard/LoginDialog";
import {
  readBackgroundItems,
  readGalleryItems,
  readLeaderItems,
  readSocialLinks,
  writeBackgroundItems,
  writeGalleryItems,
  writeLeaderItems,
  writeSocialLinks,
} from "../services/contentStorage";

const TEMP_ADMIN_PASSWORD = "aditya-admin";

function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("athletics-dashboard-auth") === "true",
  );
  const [galleryItems, setGalleryItems] = useState([]);
  const [backgroundItems, setBackgroundItems] = useState([]);
  const [leaderItems, setLeaderItems] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardContent() {
      const [gallery, backgrounds, leaders, links] = await Promise.all([
        readGalleryItems(),
        readBackgroundItems(),
        readLeaderItems(),
        readSocialLinks(),
      ]);

      if (!ignore) {
        setGalleryItems(gallery);
        setBackgroundItems(backgrounds);
        setLeaderItems(leaders);
        setSocialLinks(links);
      }
    }

    loadDashboardContent();

    return () => {
      ignore = true;
    };
  }, []);

  const latestImage = useMemo(
    () => galleryItems[galleryItems.length - 1],
    [galleryItems],
  );

  const handleLogin = (password) => {
    if (password !== TEMP_ADMIN_PASSWORD) {
      return false;
    }

    sessionStorage.setItem("athletics-dashboard-auth", "true");
    setIsAuthenticated(true);
    return true;
  };

  const handleLogout = () => {
    sessionStorage.removeItem("athletics-dashboard-auth");
    setIsAuthenticated(false);
  };

  const handleUpdateGalleryItem = (id, updates) => {
    setGalleryItems((items) => {
      const updatedItems = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      );
      writeGalleryItems(updatedItems);
      return updatedItems;
    });
  };

  const handleDeleteGalleryItem = (id) => {
    setGalleryItems((items) => {
      const updatedItems = items.filter((item) => item.id !== id);
      writeGalleryItems(updatedItems);
      return updatedItems;
    });
  };

  const handleDeleteBackground = (id) => {
    setBackgroundItems((items) => {
      const updatedItems = items.filter((item) => item.id !== id);
      writeBackgroundItems(updatedItems);
      return updatedItems;
    });
  };

  const handleUpdateLeaderItem = (id, updates) => {
    setLeaderItems((items) => {
      const updatedItems = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      );
      writeLeaderItems(updatedItems);
      return updatedItems;
    });
  };

  const handleUpload = async (newImage) => {
    if (newImage.category === "Home Background") {
      const updatedItems = [...backgroundItems, newImage];
      try {
        await writeBackgroundItems(updatedItems);
        setBackgroundItems(updatedItems);
      } catch (error) {
        console.error("Failed to save background item to Firestore:", error);
        throw new Error(
          error?.message || "Failed to persist background image to Firestore.",
        );
      }
      return;
    }

    const updatedItems = [...galleryItems, newImage];
    try {
      await writeGalleryItems(updatedItems);
      setGalleryItems(updatedItems);
    } catch (error) {
      console.error("Failed to save gallery item to Firestore:", error);
      throw new Error(
        error?.message || "Failed to persist gallery image to Firestore.",
      );
    }
  };

  const handleAddSocialLink = (newLink) => {
    setSocialLinks((items) => {
      const updatedItems = [
        ...items,
        {
          ...newLink,
          id: `${newLink.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        },
      ];
      writeSocialLinks(updatedItems);
      return updatedItems;
    });
  };

  const handleDeleteSocialLink = (id) => {
    setSocialLinks((items) => {
      const updatedItems = items.filter((item) => item.id !== id);
      writeSocialLinks(updatedItems);
      return updatedItems;
    });
  };

  if (!isAuthenticated) {
    return <LoginDialog onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout
      backgroundItems={backgroundItems}
      galleryItems={galleryItems}
      leaderItems={leaderItems}
      latestImage={latestImage}
      onAddSocialLink={handleAddSocialLink}
      onDeleteBackground={handleDeleteBackground}
      onDeleteGalleryItem={handleDeleteGalleryItem}
      onDeleteSocialLink={handleDeleteSocialLink}
      onLogout={handleLogout}
      onUpdateLeaderItem={handleUpdateLeaderItem}
      onUpdateGalleryItem={handleUpdateGalleryItem}
      onUpload={handleUpload}
      socialLinks={socialLinks}
    />
  );
}

export default Dashboard;
