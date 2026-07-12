import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import LeaderCard from "../components/leaders/LeaderCard";
import { readLeaderItems } from "../services/contentStorage";
import { orgtreeLinks } from "../services/orgtreeLinks";

function Leaders() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadLeaders() {
      const items = await readLeaderItems();
      if (!ignore) {
        setLeaders(items);
      }
    }

    loadLeaders();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="page-section">
      <div className="section-intro">
        <p className="eyebrow">Leadership</p>
        <h1>Our Coaches and Mentors</h1>
        <p>
          The leadership team keeps the club organized, motivated, and connected
          to the wider Institutions community.
        </p>
        <Button href={orgtreeLinks.clubMembers} variant="secondary">
          See Club Members
        </Button>
      </div>

      <div className="card-grid">
        {leaders.map((leader) => (
          <LeaderCard key={leader.name} leader={leader} />
        ))}
      </div>
    </section>
  );
}

export default Leaders;
