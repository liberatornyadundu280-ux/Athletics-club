import Button from "../common/Button";

function JoinClubModal({ error, isOpen, onClose, onConfirm, onReject }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="join-club-title"
        aria-modal="true"
        className="join-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Membership check</p>
        <h2 id="join-club-title">Are you a student of Aditya Institutions?</h2>
        <p>
          Club membership requests are handled through Orgtree and are currently
          available to Aditya Institutions students.
        </p>

        {error ? (
          <p className="modal-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="modal-actions">
          <Button onClick={onConfirm}>Yes, continue</Button>
          <Button onClick={onReject} variant="danger">
            No
          </Button>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </section>
    </div>
  );
}

export default JoinClubModal;
