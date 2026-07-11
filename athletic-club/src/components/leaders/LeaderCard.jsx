function LeaderCard({ leader }) {
  return (
    <article className="leader-card">
      <div className="leader-avatar">
        {leader.image ? (
          <img alt={`${leader.name} avatar`} src={leader.image} />
        ) : (
          <span aria-hidden="true">
            {leader.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
        )}
      </div>
      <div>
        <p className="eyebrow">{leader.position}</p>
        <h3>{leader.name}</h3>
        <p>{leader.biography}</p>
      </div>
    </article>
  );
}

export default LeaderCard;
