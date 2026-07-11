import { useState } from 'react';
import Button from '../common/Button';

function LoginDialog({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const didLogin = onLogin(password);

    if (!didLogin) {
      setError('Incorrect temporary admin password.');
    }
  };

  return (
    <section className="dashboard-login">
      <form className="dashboard-login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Hidden dashboard</p>
        <h1>Content Management Dashboard</h1>
        <p>Temporary development login for managing visual website content.</p>

        <label htmlFor="dashboard-password">Password</label>
        <input
          id="dashboard-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter temporary password"
          type="password"
          value={password}
        />

        {error ? <p className="modal-error" role="alert">{error}</p> : null}

        <Button className="dashboard-login-button" type="submit">
          Login
        </Button>
        <p className="dashboard-note">Development password: aditya-admin</p>
      </form>
    </section>
  );
}

export default LoginDialog;
