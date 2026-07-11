import { activities } from "../data/activities";

function WhatWeDo() {
  return (
    <section className="page-section">
      <div className="section-intro">
        <p className="eyebrow">What we do</p>
        <h1>
          Training that supports beginners, competitors, and everyone in
          between.
        </h1>
        <p>
          The club offers practical athletics training, fitness support, and
          team preparation for students who want to stay healthy, improve
          performance, or represent the Institutions.
        </p>
      </div>

      <div className="activity-grid">
        {activities.map((activity, index) => (
          <article className="activity-card" key={activity.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{activity.title}</h2>
            <p>{activity.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WhatWeDo;
