import { useState } from "react";
import Button from "../common/Button";

function AdminManager({ adminEmails, onAddAdmin, onRemoveAdmin }) {
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!newEmail.trim()) {
      setError("Enter an email address to grant access.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onAddAdmin(newEmail);
      setStatus("Admin access granted.");
      setNewEmail("");
    } catch (addError) {
      setError(addError.message || "Failed to grant admin access.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (email) => {
    setError("");
    setStatus("");

    try {
      await onRemoveAdmin(email);
      setStatus("Admin access revoked.");
    } catch (removeError) {
      setError(removeError.message || "Failed to revoke admin access.");
    }
  };

  return (
    <div className="dashboard-admin-manager">
      <p className="eyebrow">Access control</p>
      <h2>Admin access</h2>
      <p>
        Only these accounts can access the dashboard. Every admin can grant or
        revoke access, including access granted by another admin, so leadership
        can be handed over when students leave college.
      </p>

      <form className="dashboard-admin-add" onSubmit={handleAdd}>
        <label htmlFor="dashboard-admin-email">New admin email</label>
        <div className="dashboard-admin-add-row">
          <input
            autoComplete="email"
            id="dashboard-admin-email"
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="new.admin@example.com"
            type="email"
            value={newEmail}
          />
          <Button
            className="dashboard-login-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Granting..." : "Grant Access"}
          </Button>
        </div>
      </form>

      {status ? <p className="dashboard-message">{status}</p> : null}
      {error ? (
        <p className="modal-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dashboard-admin-list" aria-label="Approved admins">
        {adminEmails.map((admin) => (
          <div className="dashboard-admin-row" key={admin.email}>
            <div className="dashboard-admin-identity">
              <strong>{admin.email}</strong>
              <span>
                {admin.owner
                  ? "Owner"
                  : `Granted by ${admin.addedBy || "admin"}`}
              </span>
            </div>
            <Button
              className="dashboard-admin-remove"
              onClick={() => handleRemove(admin.email)}
              type="button"
              variant="danger"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminManager;
