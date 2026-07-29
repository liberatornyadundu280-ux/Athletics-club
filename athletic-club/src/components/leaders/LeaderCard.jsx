import { useState } from "react";

function LeaderCard({ leader }) {
  const [showBio, setShowBio] = useState(false);

  return (
    <>
      <article className="leader-card">
        <div className="leader-avatar">
          {leader.image ? (
            <img alt={`${leader.name} avatar`} src={leader.image} />
          ) : (
            <span aria-hidden="true">
              {leader.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
        </div>
        <div className="leader-card-content">
          <p className="eyebrow leader-card-position">{leader.position}</p>
          <div className="leader-card-heading">
            <h3>{leader.name}</h3>
          </div>
          <p className="leader-bio">{leader.biography}</p>
        </div>
        <button
          type="button"
          className="leader-card-toggle"
          onClick={() => setShowBio(true)}
        >
          Read more
        </button>
      </article>

      {showBio ? (
        <div className="leader-bio-overlay" role="dialog" aria-modal="true">
          <div className="leader-bio-panel">
            <button
              type="button"
              className="leader-bio-close"
              onClick={() => setShowBio(false)}
              aria-label={`Close bio for ${leader.name}`}
            >
              ×
            </button>
            <div className="leader-bio-header">
              <div className="leader-avatar leader-avatar-small">
                {leader.image ? (
                  <img alt={`${leader.name} avatar`} src={leader.image} />
                ) : (
                  <span aria-hidden="true">
                    {leader.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <p className="eyebrow">{leader.position}</p>
                <h3>{leader.name}</h3>
              </div>
            </div>
            <p className="leader-bio-full">{leader.biography}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default LeaderCard;
