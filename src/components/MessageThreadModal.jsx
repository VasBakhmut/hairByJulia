import { useMemo, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Modal } from "./Modal.jsx";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { NOW } from "../lib/format.js";

function formatBubbleTime(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === NOW.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export function MessageThreadModal() {
  const { clients, messages, ui } = useAppState();
  const actions = useAppActions();
  const open = !!ui.threadClientId;
  const client = clients.find((c) => c.id === ui.threadClientId);
  const [draft, setDraft] = useState("");

  const thread = useMemo(
    () => messages.filter((m) => m.clientId === ui.threadClientId).sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)),
    [messages, ui.threadClientId]
  );

  function send() {
    if (!draft.trim() || !client) return;
    actions.sendMessage([client.id], draft.trim(), "custom");
    setDraft("");
  }

  return (
    <Modal open={open} onClose={() => actions.closeThread()} title={client ? client.name : "Conversation"} width={440} className="thread-modal">
      <div className="thread-scroll">
        {thread.length === 0 && <p className="empty-hint">No messages yet.</p>}
        {thread.map((m) => (
          <div key={m.id} className={`bubble-row ${m.direction}`}>
            <div className="bubble">
              <p>{m.text}</p>
              <small>
                {formatBubbleTime(m.sentAt)}
                {m.kind && m.kind !== "custom" && ` · ${m.kind}`}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="thread-composer">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Message ${client?.name ?? ""}…`}
        />
        <button onClick={send} disabled={!draft.trim()} aria-label="Send">
          <PaperPlaneTilt />
        </button>
      </div>
    </Modal>
  );
}
