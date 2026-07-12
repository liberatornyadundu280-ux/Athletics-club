import { useEffect, useState } from "react";
import Hero from "../components/home/Hero";
import Button from "../components/common/Button";
import SocialLinks from "../components/common/SocialLinks";
import LeaderCard from "../components/leaders/LeaderCard";
import { activities } from "../data/activities";
import { readGalleryItems, readLeaderItems } from "../services/contentStorage";

function Home() {
  const [leaders, setLeaders] = useState([]);
  const [featuredGallery, setFeaturedGallery] = useState([]);
  const featuredActivities = activities.slice(0, 3);
  const featuredLeaders = leaders.slice(0, 2);

  useEffect(() => {
    let ignore = false;

    async function loadHomeContent() {
      const [galleryItems, leaderItems] = await Promise.all([
        readGalleryItems(),
        readLeaderItems(),
      ]);

      if (!ignore) {
        setFeaturedGallery(galleryItems.slice(0, 3));
        setLeaders(leaderItems);
      }
    }

    loadHomeContent();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <Hero />

      <section
        className="home-preview-section home-about-preview"
        id="home-about-preview"
        data-nav-section="about"
      >
        <div className="home-preview-copy">
          <p className="eyebrow">About the club</p>
          <h2>
            More than athletics. A team built on health, discipline, and
            belonging.
          </h2>
          <p>
            The Aditya Institutions Athletics Club helps students train
            consistently, prepare for competitions, and stay connected to a
            supportive sporting community.
          </p>
          <Button to="/about" variant="secondary">
            Learn About Us
          </Button>
        </div>

        <div className="home-stat-grid" aria-label="Club highlights">
          <article>
            <strong>Track</strong>
            <span>Sprints, relays, pace work</span>
          </article>
          <article>
            <strong>Field</strong>
            <span>Jumps, throws, technique</span>
          </article>
          <article>
            <strong>Fitness</strong>
            <span>Strength, mobility, wellness</span>
          </article>
        </div>
      </section>

      <section className="home-preview-section" data-nav-section="activities">
        <div className="home-section-header">
          <div>
            <p className="eyebrow">Activities gallery</p>
            <h2>See the club in motion.</h2>
          </div>
          <Button to="/activities" variant="secondary">
            Explore Gallery
          </Button>
        </div>

        <div className="home-gallery-strip">
          {featuredGallery.map((item) => (
            <article className="home-gallery-card" key={item.id}>
              <img alt={item.caption} src={item.image} />
              <div>
                <span>{item.category}</span>
                <p>{item.caption}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-preview-section" data-nav-section="what-we-do">
        <div className="home-section-header">
          <div>
            <p className="eyebrow">What we do</p>
            <h2>Training pathways for every student athlete.</h2>
          </div>
          <Button to="/what-we-do" variant="secondary">
            View All Activities
          </Button>
        </div>

        <div className="home-activity-preview">
          {featuredActivities.map((activity, index) => (
            <article key={activity.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{activity.title}</h3>
              <p>{activity.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="home-preview-section home-leaders-preview"
        data-nav-section="leaders"
      >
        <div className="home-preview-copy">
          <p className="eyebrow">Coaches and mentors</p>
          <h2>Guidance that keeps the team organized and improving.</h2>
          <p>
            Meet the people who coordinate training, support athletes, and share
            club moments with the wider Aditya community.
          </p>
          <Button to="/leaders" variant="secondary">
            Meet the Leaders
          </Button>
        </div>

        <div className="home-leader-list">
          {featuredLeaders.map((leader) => (
            <LeaderCard leader={leader} key={leader.name} />
          ))}
        </div>
      </section>

      <section
        className="home-preview-section home-contact-preview"
        data-nav-section="contact"
      >
        <div>
          <p className="eyebrow">Connect</p>
          <h2>Ready to train, ask questions, or follow the journey?</h2>
          <p>
            Contact the club, explore our social platforms, or start your
            joining process through Orgtree.
          </p>
        </div>
        <div className="home-contact-actions">
          <SocialLinks />
          <Button to="/contact">Contact the Club</Button>
        </div>
      </section>
    </>
  );
}

export default Home;
