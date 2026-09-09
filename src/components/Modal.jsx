import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

/** Generic centered modal window — replaces the old slide-over panel pattern everywhere
 *  a "nice window" is wanted instead (client detail, add client, message thread, compose). */
export function Modal({ open, onClose, title, children, width = 480, className = "" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`modal-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`modal-box ${className} ${open ? "open" : ""}`} style={{ "--modal-width": `${width}px` }} role="dialog" aria-modal="true">
        <div className="modal-box-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="modal-box-body">{children}</div>
      </div>
    </>
  );
}
