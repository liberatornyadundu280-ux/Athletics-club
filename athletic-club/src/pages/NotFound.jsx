import Button from '../components/common/Button';

function NotFound() {
  return (
    <section className="page-section not-found">
      <div className="section-intro">
        <p className="eyebrow">404</p>
        <h1>Page not found.</h1>
        <p>The page you are looking for does not exist or has moved.</p>
        <Button to="/">Return Home</Button>
      </div>
    </section>
  );
}

export default NotFound;
