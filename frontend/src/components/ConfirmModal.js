/*
 * ConfirmModal.js — Reusable centered confirmation dialog.
 *
 * Drop-in replacement for window.confirm(). Usage:
 *   <ConfirmModal
 *     open={state}
 *     title="Delete this review?"
 *     message="This action cannot be undone."
 *     confirmText="DELETE"
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */

import { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "",
  confirmText = "CONFIRM",
  cancelText = "CANCEL",
  danger = true,
  onConfirm,
  onCancel,
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-modal-title">{title}</div>
        {message && <div className="confirm-modal-message">{message}</div>}
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`confirm-modal-confirm${danger ? " is-danger" : ""}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
