import { useState } from "react";
import Button from "../common/Button";

function LoginDialog({
  onConfirmPhoneCode,
  onEmailLogin,
  onGoogleLogin,
  onSendPhoneCode,
}) {
  const [authMode, setAuthMode] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runLoginAction = async (action, successMessage = "") => {
    setError("");
    setStatus("");
    setIsSubmitting(true);

    try {
      const result = await action();
      setStatus(successMessage);
      return result;
    } catch (loginError) {
      setError(loginError.message || "Authentication failed.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    await runLoginAction(() => onEmailLogin(email, password));
  };

  const handleGoogleLogin = async () => {
    await runLoginAction(onGoogleLogin);
  };

  const handleSendPhoneCode = async (event) => {
    event.preventDefault();
    const result = await runLoginAction(
      () => onSendPhoneCode(phoneNumber),
      "Verification code sent.",
    );

    if (result) {
      setConfirmationResult(result);
    }
  };

  const handleConfirmPhoneCode = async (event) => {
    event.preventDefault();

    if (!confirmationResult) {
      setError("Send a verification code first.");
      return;
    }

    await runLoginAction(() =>
      onConfirmPhoneCode(confirmationResult, verificationCode),
    );
  };

  return (
    <section className="dashboard-login">
      <div className="dashboard-login-card">
        <p className="eyebrow">Admin login</p>
        <h1>Content Management Dashboard</h1>
        <p>Login with an approved Firebase account to manage site content.</p>

        <div className="dashboard-auth-tabs" aria-label="Authentication method">
          <button
            className={authMode === "email" ? "dashboard-tab-active" : ""}
            onClick={() => setAuthMode("email")}
            type="button"
          >
            Email
          </button>
          <button
            className={authMode === "phone" ? "dashboard-tab-active" : ""}
            onClick={() => setAuthMode("phone")}
            type="button"
          >
            Phone
          </button>
        </div>

        {authMode === "email" ? (
          <form className="dashboard-auth-form" onSubmit={handleEmailSubmit}>
            <label htmlFor="dashboard-email">Email</label>
            <input
              autoComplete="email"
              id="dashboard-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />

            <label htmlFor="dashboard-password">Password</label>
            <input
              autoComplete="current-password"
              id="dashboard-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              type="password"
              value={password}
            />

            <Button
              className="dashboard-login-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Logging in..." : "Login with Email"}
            </Button>
          </form>
        ) : null}

        {authMode === "phone" ? (
          <div className="dashboard-auth-form">
            <form onSubmit={handleSendPhoneCode}>
              <label htmlFor="dashboard-phone">Phone number</label>
              <input
                autoComplete="tel"
                id="dashboard-phone"
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+919876543210"
                type="tel"
                value={phoneNumber}
              />
              <Button disabled={isSubmitting} type="submit">
                Send Code
              </Button>
            </form>

            <form onSubmit={handleConfirmPhoneCode}>
              <label htmlFor="dashboard-code">Verification code</label>
              <input
                autoComplete="one-time-code"
                id="dashboard-code"
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="123456"
                type="text"
                value={verificationCode}
              />
              <Button disabled={isSubmitting} type="submit">
                Verify Phone
              </Button>
            </form>
            <div id="phone-recaptcha" />
          </div>
        ) : null}

        <Button
          className="dashboard-login-button"
          disabled={isSubmitting}
          onClick={handleGoogleLogin}
          type="button"
          variant="secondary"
        >
          Continue with Google
        </Button>

        {status ? <p className="dashboard-message">{status}</p> : null}
        {error ? (
          <p className="modal-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default LoginDialog;
