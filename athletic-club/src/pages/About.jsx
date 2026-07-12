import { useEffect, useState } from "react";
import Button from "../components/common/Button";
import LeaderCard from "../components/leaders/LeaderCard";
import { readLeaderItems } from "../services/contentStorage";

function About() {
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
        <p className="eyebrow">About us</p>
        <h1>One Aditya, one family, one team in motion.</h1>
        <p>
          This is the official Aditya Institutions Athletics Club. We do not
          only build sports stars; we care deeply about teamwork, health, and
          the growth of every individual. With trained coaches and a welcoming
          team, students can practice, compete, and feel a real sense of
          belonging.
        </p>
        <div className="hero-actions">
          <Button to="/what-we-do">What We Do</Button>
          <Button to="/leaders" variant="secondary">
            Check Out Our Leaders
          </Button>
        </div>
      </div>

      <div className="card-grid">
        {leaders.slice(0, 3).map((leader) => (
          <LeaderCard key={leader.name} leader={leader} />
        ))}
      </div>
    </section>
  );
}

export default About;
