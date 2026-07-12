import { useState } from "react";

function SocialLinksManager({ links, onAdd, onDelete }) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedLabel = label.trim();
    const trimmedHref = href.trim();

    if (!trimmedLabel || !trimmedHref) {
      return;
    }

    onAdd({ label: trimmedLabel, href: trimmedHref });
    setLabel("");
    setHref("");
  };

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr" }}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div
          className="dashboard-grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Platform / Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Instagram"
              required
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Social URL</span>
            <input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://www.instagram.com/yourclub"
              required
            />
          </label>
        </div>
        <button className="button" type="submit">
          Add Link
        </button>
      </form>

      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}
      >
        {links.length === 0 ? (
          <p>
            No social links added yet. New links will appear on the website once
            saved.
          </p>
        ) : (
          links.map((link) => (
            <article className="dashboard-stat" key={link.id}>
              <span>{link.label}</span>
              <strong style={{ fontSize: "0.95rem", wordBreak: "break-word" }}>
                {link.href}
              </strong>
              <button
                className="button button-danger"
                onClick={() => onDelete(link.id)}
                type="button"
              >
                Remove
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default SocialLinksManager;
