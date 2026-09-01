import { useState } from "react";
import { uploadImageToCloudinary } from "../../services/cloudinaryService";
import Button from "../common/Button";

function AnnouncementManager({ announcements, onDelete, onPublish }) {
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatus("Add both a heading and announcement details.");
      return;
    }

    setSubmitting(true);
    setStatus(file ? "Uploading event image…" : "Publishing announcement…");
    try {
      let upload = null;
      if (file) upload = await uploadImageToCloudinary({ file, caption: title, category: "Announcement" });
      await onPublish({ body, eventDate, image: upload?.image, imagePublicId: upload?.publicId, title });
      setBody("");
      setEventDate("");
      setFile(null);
      setTitle("");
      setStatus("Announcement published for everyone to see.");
    } catch (error) {
      setStatus(error.message || "Could not publish the announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="dashboard-section announcement-manager">
      <div className="dashboard-section-intro">
        <p className="eyebrow">Public notice board</p>
        <h2>Publish an announcement</h2>
        <p>Share selections, trials, schedules, and event updates on the home page.</p>
      </div>
      <form className="upload-form announcement-form" onSubmit={handleSubmit}>
        <label>Heading<input maxLength="100" onChange={(event) => setTitle(event.target.value)} placeholder="U20 Selection Trials" value={title} /></label>
        <label>Event date (optional)<input onChange={(event) => setEventDate(event.target.value)} type="date" value={eventDate} /></label>
        <label>Announcement details<textarea maxLength="600" onChange={(event) => setBody(event.target.value)} placeholder="Selection trials will be held at…" value={body} /></label>
        <label>Event image (optional)<input accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>
        <Button disabled={submitting} type="submit">{submitting ? "Publishing…" : "Publish announcement"}</Button>
        {status ? <p className="dashboard-message">{status}</p> : null}
      </form>
      <div className="announcement-admin-list">
        <h3>Published announcements</h3>
        {announcements.length === 0 ? <p>No announcements published yet.</p> : announcements.map((announcement) => (
          <article className="announcement-admin-row" key={announcement.id}>
            <div><strong>{announcement.title}</strong><span>{announcement.eventDate || "No event date"}</span></div>
            <Button onClick={() => onDelete(announcement.id)} type="button" variant="danger">Remove</Button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnnouncementManager;
