import { useState } from "react";
import { Modal } from "./Modal.jsx";
import { useAppActions, useAppState } from "../store/AppContext.jsx";

export function AddClientModal() {
  const { ui } = useAppState();
  const actions = useAppActions();
  const open = ui.addClientOpen;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [prefersPrivate, setPrefersPrivate] = useState(false);

  function close() {
    actions.setAddClientOpen(false);
    setName("");
    setPhone("");
    setEmail("");
    setPrefersPrivate(false);
  }

  function submit() {
    if (!name.trim()) return;
    const id = actions.addClient({ name: name.trim(), phone: phone.trim(), email: email.trim(), prefersPrivate });
    close();
    actions.openClientPanel(id);
  }

  return (
    <Modal open={open} onClose={close} title="Add client" width={420}>
      <label className="field-label">Name</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" onKeyDown={(e) => e.key === "Enter" && submit()} />
      <label className="field-label">Phone</label>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(415) 555-0100" />
      <label className="field-label">Email (optional)</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" />
      <label className="field-checkbox">
        <input type="checkbox" checked={prefersPrivate} onChange={(e) => setPrefersPrivate(e.target.checked)} />
        Prefers private appointments (no double-booking)
      </label>
      <button className="primary wide" disabled={!name.trim()} onClick={submit}>
        Add client
      </button>
    </Modal>
  );
}
