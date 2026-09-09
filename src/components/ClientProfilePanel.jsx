import { useEffect, useState } from "react";
import { CalendarPlus, CaretDown, ChatCircleDots, EnvelopeSimple, LockSimple, LockSimpleOpen, MagnifyingGlass, PencilSimple, Phone, Plus, X } from "@phosphor-icons/react";
import { useAppActions, useAppState } from "../store/AppContext.jsx";
import { NOW, dateKey, formatShortDate } from "../lib/format.js";

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function ClientProfilePanel() {
  const { clients, ui } = useAppState();
  const actions = useAppActions();
  const liveClient = clients.find((c) => c.id === ui.clientPanelId);
  const open = !!ui.clientPanelId;

  // Keep showing the last-open client while the panel slides shut, instead of the panel
  // content going blank mid-close-animation.
  const [displayClient, setDisplayClient] = useState(liveClient);
  useEffect(() => {
    if (liveClient) setDisplayClient(liveClient);
  }, [liveClient]);

  const [expandedVisitId, setExpandedVisitId] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [freshVisitId, setFreshVisitId] = useState(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    if (!ui.clientPanelId) return;
    setExpandedVisitId(null);
    setEditingNotes(false);
    setHistoryQuery("");
    setFreshVisitId(null);
    const c = clients.find((x) => x.id === ui.clientPanelId);
    setNotesDraft(c?.generalNotes ?? "");
    setNameDraft(c?.name ?? "");
    setPhoneDraft(c?.phone ?? "");
    setEmailDraft(c?.email ?? "");
    // A client left with the "New client" placeholder name is one that was booked without
    // filling in details — jump straight into editing so it's never a dead end.
    setEditingInfo(c?.name === "New client");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.clientPanelId]);

  const client = displayClient;

  return (
    <>
      <div className={`modal-backdrop ${open ? "open" : ""}`} onClick={() => actions.closeClientPanel()} />
      <div className={`modal-box client-modal ${open ? "open" : ""}`} style={{ "--modal-width": "480px" }} role="dialog" aria-modal="true">
        {client && (
          <ClientPanelContent
            client={client}
            historyQuery={historyQuery}
            setHistoryQuery={setHistoryQuery}
            expandedVisitId={expandedVisitId}
            setExpandedVisitId={setExpandedVisitId}
            editingNotes={editingNotes}
            setEditingNotes={setEditingNotes}
            notesDraft={notesDraft}
            setNotesDraft={setNotesDraft}
            freshVisitId={freshVisitId}
            setFreshVisitId={setFreshVisitId}
            editingInfo={editingInfo}
            setEditingInfo={setEditingInfo}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            phoneDraft={phoneDraft}
            setPhoneDraft={setPhoneDraft}
            emailDraft={emailDraft}
            setEmailDraft={setEmailDraft}
          />
        )}
      </div>
    </>
  );
}

function ClientPanelContent({
  client,
  historyQuery,
  setHistoryQuery,
  expandedVisitId,
  setExpandedVisitId,
  editingNotes,
  setEditingNotes,
  notesDraft,
  setNotesDraft,
  freshVisitId,
  setFreshVisitId,
  editingInfo,
  setEditingInfo,
  nameDraft,
  setNameDraft,
  phoneDraft,
  setPhoneDraft,
  emailDraft,
  setEmailDraft,
}) {
  const actions = useAppActions();
  const latest = client.visits[0];
  const q = historyQuery.trim().toLowerCase();
  const filteredVisits = q ? client.visits.filter((v) => v.service.toLowerCase().includes(q) || v.formula.toLowerCase().includes(q)) : client.visits;

  function handleLogToday() {
    const id = actions.addVisit(client.id, { date: dateKey(NOW), service: "", formula: "" });
    setExpandedVisitId(id);
    setFreshVisitId(id);
  }

  function saveInfo() {
    if (!nameDraft.trim()) return;
    actions.updateClientInfo(client.id, { name: nameDraft.trim(), phone: phoneDraft.trim(), email: emailDraft.trim() });
    setEditingInfo(false);
  }

  return (
    <>
      <header className="client-panel-header">
        {editingInfo ? (
          <div className="client-info-edit">
            {client.name === "New client" && <p className="name-nudge">Give this client a name so you can find them later.</p>}
            <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Full name" onKeyDown={(e) => e.key === "Enter" && saveInfo()} />
            <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} placeholder="Phone" />
            <input value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="Email (optional)" />
            <div className="row-actions">
              {client.name !== "New client" && (
                <button
                  onClick={() => {
                    setNameDraft(client.name);
                    setPhoneDraft(client.phone);
                    setEmailDraft(client.email ?? "");
                    setEditingInfo(false);
                  }}
                >
                  Cancel
                </button>
              )}
              <button className="primary" disabled={!nameDraft.trim()} onClick={saveInfo}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="client-panel-id">
            <div className="client-avatar">{initials(client.name)}</div>
            <div>
              <h2>
                {client.name}
                <button className="icon-btn inline-edit" title="Edit name / phone / email" onClick={() => setEditingInfo(true)}>
                  <PencilSimple />
                </button>
              </h2>
              <p>
                <Phone size={12} /> {client.phone}
              </p>
            </div>
          </div>
        )}
        <button className="icon-btn" onClick={() => actions.closeClientPanel()}>
          <X />
        </button>
      </header>

      <div className="client-panel-tags">
        <button
          className={`tag ${client.prefersPrivate ? "private" : ""}`}
          title={client.prefersPrivate ? "No one else gets squeezed into this client's processing/downtime — tap to allow it" : "Julia can book someone else during this client's processing/downtime — tap to make private"}
          onClick={() => actions.setClientPrivate(client.id, !client.prefersPrivate)}
        >
          {client.prefersPrivate ? <LockSimple /> : <LockSimpleOpen />} {client.prefersPrivate ? "Private — no double-booking" : "Can double-book downtime"}
        </button>
        <button
          className="tag outline"
          onClick={() => {
            actions.openAssistant({ clientId: client.id });
            actions.closeClientPanel();
          }}
        >
          <CalendarPlus /> Book appointment
        </button>
        <button
          className="tag outline"
          onClick={() => {
            actions.openThread(client.id);
            actions.closeClientPanel();
          }}
        >
          <ChatCircleDots /> Message
        </button>
        {client.email && (
          <span className="tag plain">
            <EnvelopeSimple /> {client.email}
          </span>
        )}
      </div>

      <div className="client-panel-body">
        <section>
          <p className="section-label">Last formula</p>
          {latest ? (
            <div className="formula-callout">
              <div className="formula-callout-head">
                <b>{latest.service || "Untitled visit"}</b>
                <span>{formatShortDate(latest.date)}</span>
              </div>
              <p>{latest.formula || <em>No formula logged yet.</em>}</p>
            </div>
          ) : (
            <p className="empty-hint">No visits logged yet.</p>
          )}
          <button className="primary wide" onClick={handleLogToday}>
            <Plus /> Log today&rsquo;s visit
          </button>
        </section>

        <section>
          <p className="section-label">
            Visit history {client.visits.length > 0 && `(${client.visits.length})`}
          </p>
          {client.visits.length >= 3 && (
            <div className="history-search">
              <MagnifyingGlass />
              <input placeholder="Find a past formula or service…" value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} />
            </div>
          )}
          <div className="visit-list">
            {filteredVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                clientId={client.id}
                isLatest={visit.id === latest?.id}
                expanded={expandedVisitId === visit.id}
                onToggle={() => setExpandedVisitId((v) => (v === visit.id ? null : visit.id))}
                autoEdit={freshVisitId === visit.id}
              />
            ))}
            {filteredVisits.length === 0 && client.visits.length > 0 && <p className="empty-hint">No visits match &ldquo;{historyQuery}&rdquo;.</p>}
            {client.visits.length === 0 && <p className="empty-hint">Nothing yet — log the first visit above.</p>}
          </div>
        </section>

        <section className="notes-section">
          <div className="section-label-row">
            <p className="section-label">General notes</p>
            {!editingNotes && (
              <button className="icon-btn" onClick={() => setEditingNotes(true)}>
                <PencilSimple />
              </button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea rows={3} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Allergies, preferences, anything worth remembering…" />
              <div className="row-actions">
                <button
                  onClick={() => {
                    setNotesDraft(client.generalNotes ?? "");
                    setEditingNotes(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    actions.updateClientNotes(client.id, notesDraft);
                    setEditingNotes(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="notes-text">{client.generalNotes || <em>No general notes.</em>}</p>
          )}
        </section>
      </div>
    </>
  );
}

function VisitCard({ visit, clientId, isLatest, expanded, onToggle, autoEdit }) {
  const actions = useAppActions();
  const [editing, setEditing] = useState(autoEdit);
  const [service, setService] = useState(visit.service);
  const [formula, setFormula] = useState(visit.formula);

  useEffect(() => {
    setService(visit.service);
    setFormula(visit.formula);
  }, [visit.service, visit.formula]);

  function save() {
    actions.updateVisit(clientId, visit.id, { service, formula });
    setEditing(false);
  }

  return (
    <div className={`visit-card ${isLatest ? "latest" : ""}`}>
      <button className="visit-card-head" onClick={onToggle}>
        <div>
          <b>
            {visit.service || <em>Untitled visit</em>}
            {isLatest && <em className="latest-tag">Latest</em>}
          </b>
          <small>{formatShortDate(visit.date)}</small>
        </div>
        <CaretDown className={expanded ? "rotated" : ""} />
      </button>
      {expanded && (
        <div className="visit-card-body">
          {!editing ? (
            <>
              <p>{visit.formula || <em>No formula notes.</em>}</p>
              <button className="link-btn" onClick={() => setEditing(true)}>
                <PencilSimple /> Edit
              </button>
            </>
          ) : (
            <div className="visit-edit">
              <input autoFocus={autoEdit} value={service} onChange={(e) => setService(e.target.value)} placeholder="Service" />
              <textarea rows={4} value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="Formula / recipe notes…" />
              <div className="row-actions">
                <button onClick={() => setEditing(false)}>Cancel</button>
                <button className="primary" onClick={save}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
