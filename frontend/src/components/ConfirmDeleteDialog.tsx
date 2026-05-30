interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteDialog({ onCancel, onConfirm }: Props) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Session?</h3>
        <p>
          This action cannot be undone. The session and all its messages will be
          permanently deleted.
        </p>
        <div className="confirm-actions">
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
