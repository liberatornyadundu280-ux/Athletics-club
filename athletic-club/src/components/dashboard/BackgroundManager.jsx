function BackgroundManager({ backgroundItems, onDelete }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-card-grid">
        {backgroundItems.map((item, index) => (
          <article className="dashboard-image-card" key={item.id}>
            <img alt={item.caption} src={item.image} />
            <p className="eyebrow">Slide {index + 1}</p>
            <h3>{item.caption}</h3>
            <p>Previewed in the landing page background rotation.</p>
            <button
              className="button button-danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this background image?')) {
                  onDelete(item.id);
                }
              }}
              type="button"
            >
              Delete Background
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BackgroundManager;
