import { useState } from "react";

function formatDate(value) {
  if (!value) return "New announcement";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "New announcement"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function AnnouncementBoard({ announcements }) {
  const [sharedId, setSharedId] = useState("");

  const handleShare = async (announcement) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#announcements`;
    const shareData = { text: announcement.body, title: announcement.title, url: shareUrl };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${announcement.title}\n${announcement.body}\n${shareUrl}`);
        setSharedId(announcement.id);
        window.setTimeout(() => setSharedId(""), 2200);
      }
    } catch (error) {
      if (error.name !== "AbortError") setSharedId("");
    }
  };

  if (announcements.length === 0) return null;

  return (
    <section className="announcement-board" id="announcements" aria-label="Latest announcements">
      <div className="announcement-board-heading">
        <div>
          <p className="eyebrow">Notice board</p>
          <h2>Latest announcements</h2>
        </div>
        <span>Aditya Athletics Club</span>
      </div>
      <div className="announcement-list">
        {announcements.slice(0, 3).map((announcement) => (
          <article className="announcement-card" key={announcement.id}>
            {announcement.image ? <img alt="" className="announcement-image" src={announcement.image} /> : null}
            <div className="announcement-copy">
              <time dateTime={announcement.eventDate || announcement.publishedAt}>
                {formatDate(announcement.eventDate)}
              </time>
              <h3>{announcement.title}</h3>
              <p>{announcement.body}</p>
              <button className="announcement-share" onClick={() => handleShare(announcement)} type="button">
                {sharedId === announcement.id ? "Link copied" : "Share announcement"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnnouncementBoard;
