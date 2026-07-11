function Overview({ backgroundItems, galleryItems, latestImage }) {
  const stats = [
    { label: 'Total Gallery Images', value: galleryItems.length },
    { label: 'Home Background Images', value: backgroundItems.length },
    { label: 'Latest Uploaded Image', value: latestImage?.caption ?? 'No images yet' },
    { label: 'Storage Usage', value: 'Cloudinary pending' },
    { label: 'Last Updated', value: new Date().toLocaleDateString() },
  ];

  return (
    <div className="dashboard-grid">
      {stats.map((stat) => (
        <article className="dashboard-stat" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </div>
  );
}

export default Overview;
