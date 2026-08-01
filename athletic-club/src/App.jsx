import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./contexts/authContext";
import { readBackgroundItems } from "./services/contentStorage";

function App() {
  useEffect(() => {
    let mounted = true;

    async function setActivityBackground() {
      try {
        const backgrounds = await readBackgroundItems();
        if (!mounted || !backgrounds || backgrounds.length === 0) return;

        // pick a random background image
        const candidate =
          backgrounds[Math.floor(Math.random() * backgrounds.length)];
        const imageUrl = candidate?.image ?? "";

        if (imageUrl) {
          document.documentElement.style.setProperty(
            "--site-activity-image",
            `url(${imageUrl})`,
          );
          document.body.classList.add("has-activity-bg");
        }
      } catch {
        // ignore — decorative only
        // console.error('Failed to set site activity background', err);
      }
    }

    setActivityBackground();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
