import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import LoginDialog from "../components/dashboard/LoginDialog";
import { useAuth } from "../contexts/authContext/useAuth";
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

function Dashboard() {
  const {
    confirmPhoneCode,
    loading: authLoading,
    loginWithEmail,
    loginWithGoogle,
    sendPhoneCode,
    signOutUser,
    userLoggedIn,
  } = useAuth();
  const [galleryItems, setGalleryItems] = useState([]);
  const [backgroundItems, setBackgroundItems] = useState([]);
  const [leaderItems, setLeaderItems] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    if (authLoading || !userLoggedIn) {
      return undefined;
    }

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
  }, [authLoading, userLoggedIn]);

  const latestImage = useMemo(
    () => galleryItems[galleryItems.length - 1],
    [galleryItems],
  );

  const handleLogout = async () => {
    await signOutUser();
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
          { cause: error },
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
        { cause: error },
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

  if (authLoading) {
    return (
      <section className="dashboard-login">
        <div className="dashboard-login-card">
          <p className="eyebrow">Admin</p>
          <h1>Checking access</h1>
          <p>Loading your authentication status.</p>
        </div>
      </section>
    );
  }

  if (!userLoggedIn) {
    return (
      <LoginDialog
        onConfirmPhoneCode={confirmPhoneCode}
        onEmailLogin={loginWithEmail}
        onGoogleLogin={loginWithGoogle}
        onSendPhoneCode={sendPhoneCode}
      />
    );
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
