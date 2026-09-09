import { useEffect, useMemo, useState } from "react";
import { CaretRight, Check, Clock, ClockCounterClockwise, MapPinLine, Scissors, Sparkle, Stack, WarningCircle, X } from "@phosphor-icons/react";
import { useAppActions, useAppState, useAnnounce } from "../store/AppContext.jsx";
import { NOW, dateKey, durationLabel, formatDayLabel, formatRange, keyToDate } from "../lib/format.js";
import { snapAndClamp } from "../lib/geometry.js";
import { appointmentDuration, findConflictingAppointment, lastAppointmentFor, searchAvailability } from "../lib/scheduling.js";

const quickDurations = [45, 60, 90, 120];

/**
 * The whole flow is three numbered, always-visible steps — who, how long, when — in the order
 * a receptionist would actually think about a booking. Nothing about "how long" is hidden
 * behind a checkbox: a plain appointment vs. one with processing/downtime (a colour, say) is a
 * big, obvious two-button choice right at the top of step 2, because that's exactly the thing
 * that makes a card look like Anna's on the calendar.
 *
 * Two real phone calls this has to cover: "book me for a colour, whenever you're free" (search
 * step 3's suggested list) and "book me at exactly 3pm Tuesday" (the exact-time fallback below
 * the list — allowed even if it overlaps someone, with a clear warning, because Julia's answer
 * to that is to drag the other booking a few minutes clear, not to be told no).
 */
export function FindTimeAssistant() {
  const { appointments, clients, ui } = useAppState();
  const actions = useAppActions();
  const announce = useAnnounce();
  const prefill = ui.assistantPrefill;

  const [duration, setDuration] = useState(90);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [clientQuery, setClientQuery] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [uninterrupted, setUninterrupted] = useState(false);
  const [showClientMatches, setShowClientMatches] = useState(false);
  const [exactDate, setExactDate] = useState("");
  const [exactTime, setExactTime] = useState("");

  // Multi-stage services — a colour that needs to develop, say — where Julia is free for
  // part of the appointment. Kept to one plain-language 3-step template (work → free → work)
  // instead of a generic stage builder, since that covers the real day-to-day case and stays
  // simple to fill in.
  const [multiStep, setMultiStep] = useState(false);
  const [stageA, setStageA] = useState(30);
  const [stageB, setStageB] = useState(30);
  const [stageC, setStageC] = useState(20);

  // Reset the flow each time the assistant is (re)opened, honoring any prefill from tapping
  // a specific slot on the calendar.
  useEffect(() => {
    const initialDuration = prefill?.slot ? Math.min(45, prefill.slot.maxDurationMin) : 90;
    setDuration(initialDuration);
    setHours(Math.floor(initialDuration / 60));
    setMinutes(initialDuration % 60);
    setClientQuery(prefill?.clientId ? clients.find((c) => c.id === prefill.clientId)?.name ?? "" : "");
    setServiceQuery("");
    setUninterrupted(false);
    setMultiStep(false);
    setStageA(30);
    setStageB(30);
    setStageC(20);
    setExactDate("");
    setExactTime("");
    if (prefill?.slot) {
      setSelectedSlot({ date: prefill.slot.date, startMin: prefill.slot.startMin, endMin: prefill.slot.startMin + initialDuration, context: prefill.slot.context, pinned: true });
    } else {
      setSelectedSlot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.assistantOpen, prefill]);

  const slots = useMemo(() => searchAvailability(appointments, duration, NOW, { daysAhead: 14, limit: 8 }), [appointments, duration]);

  const clientMatches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    // Show the full client list the moment the field is focused (tapping in should feel like
    // opening a pick-list), then narrow it down as she types.
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [clients, clientQuery]);

  const matchingClient = clients.find((c) => c.name.toLowerCase() === clientQuery.trim().toLowerCase());

  // "How long does this actually take Anna" isn't a generic service preset — it's whatever it
  // took her last time (thick hair processes longer, fine hair less). Surface it as a one-tap
  // suggestion the moment she's a recognised client, never forced.
  const recall = useMemo(() => {
    if (!matchingClient) return null;
    return lastAppointmentFor(appointments, matchingClient.id, serviceQuery, dateKey(NOW));
  }, [matchingClient, appointments, serviceQuery]);

  const previewStages = useMemo(
    () =>
      multiStep
        ? [
            { label: "Hands-on", durationMin: stageA, occupiesStylist: true },
            { label: "Processing / open", durationMin: stageB, occupiesStylist: false },
            { label: "Hands-on", durationMin: stageC, occupiesStylist: true },
          ]
        : [{ label: "Hands-on", durationMin: duration, occupiesStylist: true }],
    [multiStep, stageA, stageB, stageC, duration]
  );

  // Whatever time is currently selected — from the list, the calendar, or typed in by hand —
  // check it live so a real conflict is never a surprise after clicking "Book appointment".
  const previewConflict = useMemo(() => {
    if (!selectedSlot) return null;
    return findConflictingAppointment(appointments, { date: selectedSlot.date, stages: previewStages }, selectedSlot.startMin);
  }, [selectedSlot, appointments, previewStages]);
  const previewConflictClient = previewConflict ? clients.find((c) => c.id === previewConflict.clientId) : null;

  const pickDuration = (value) => {
    setDuration(value);
    setHours(Math.floor(value / 60));
    setMinutes(value % 60);
    setSelectedSlot(null);
  };
  const applyManual = () => pickDuration(Math.max(5, hours * 60 + minutes));

  function toggleMultiStep(on) {
    setMultiStep(on);
    if (on) pickDuration(stageA + stageB + stageC);
    else pickDuration(90);
  }

  function handleStageChange(which, rawValue) {
    const v = Math.max(5, Math.round((Number(rawValue) || 0) / 5) * 5);
    const next = { a: stageA, b: stageB, c: stageC, [which]: v };
    setStageA(next.a);
    setStageB(next.b);
    setStageC(next.c);
    pickDuration(next.a + next.b + next.c);
  }

  function pickClient(client) {
    setClientQuery(client.name);
    setShowClientMatches(false);
    if (client.prefersPrivate) setUninterrupted(true);
  }

  function applyRecall(pastAppt) {
    if (pastAppt.stages.length >= 3) {
      setMultiStep(true);
      setStageA(pastAppt.stages[0].durationMin);
      setStageB(pastAppt.stages[1].durationMin);
      setStageC(pastAppt.stages[2].durationMin);
      pickDuration(pastAppt.stages[0].durationMin + pastAppt.stages[1].durationMin + pastAppt.stages[2].durationMin);
    } else {
      setMultiStep(false);
      pickDuration(appointmentDuration(pastAppt));
    }
    if (!serviceQuery.trim()) setServiceQuery(pastAppt.serviceLabel);
  }

  function useExactTime() {
    if (!exactDate || !exactTime) {
      announce("Pick a date and a time first");
      return;
    }
    const [h, m] = exactTime.split(":").map(Number);
    const startMin = snapAndClamp(h * 60 + m, duration);
    setSelectedSlot({ date: exactDate, startMin, endMin: startMin + duration });
  }

  function confirm() {
    if (!selectedSlot) {
      announce("Pick a time first");
      return;
    }
    const name = clientQuery.trim() || "New client";
    let client = matchingClient;
    if (!client) {
      const id = actions.addClient({ name, prefersPrivate: uninterrupted });
      client = { id, name };
    }
    // Squeezed in — whether it's a legitimate fit into someone's free/processing time or a real
    // clash — gets its own side lane so the two cards sit next to each other, not stacked
    // unreadably on top of one another.
    const isSqueeze = !!selectedSlot.overlap || !!previewConflict || (!!selectedSlot.pinned && !!prefill?.slot?.context);
    const apptId = actions.addAppointment({
      clientId: client.id,
      date: selectedSlot.date,
      startMin: selectedSlot.startMin,
      serviceLabel: serviceQuery.trim() || "Appointment",
      allowParallelBooking: !uninterrupted,
      lane: isSqueeze ? "parallel" : "primary",
      stages: previewStages,
    });
    actions.setSelectedDate(keyToDate(selectedSlot.date));
    actions.setView("Day");
    actions.setScrollTarget(apptId);
    announce(
      previewConflict
        ? `Booked ${name} · ${formatRange(selectedSlot.startMin, selectedSlot.endMin)} — double-booked with ${previewConflictClient?.name ?? "another client"}`
        : `Booked ${name} · ${formatRange(selectedSlot.startMin, selectedSlot.endMin)}`
    );
    actions.closeAssistant();
    // Booked without a real name — don't leave a nameless "New client" ghost behind, walk
    // straight into their profile so it's obvious how to fix it.
    if (name === "New client") actions.openClientPanel(client.id);
  }

  return (
    <aside className="assistant">
      <div className="assistant-title">
        <h2>New booking</h2>
        <button onClick={() => actions.closeAssistant()}><X /></button>
      </div>

      <div className="step">
        <div className="step-head">
          <span className="step-num">1</span>
          <b>Who is this for?</b>
        </div>
        <div className="autocomplete">
          <input
            placeholder="Client name"
            value={clientQuery}
            onFocus={() => setShowClientMatches(true)}
            onChange={(e) => {
              setClientQuery(e.target.value);
              setShowClientMatches(true);
            }}
            onBlur={() => window.setTimeout(() => setShowClientMatches(false), 120)}
          />
          {showClientMatches && clientMatches.length > 0 && (
            <div className="autocomplete-list">
              {clientMatches.map((c) => (
                <button key={c.id} onMouseDown={() => pickClient(c)}>
                  {c.name}
                  {c.prefersPrivate && <small> · private</small>}
                </button>
              ))}
            </div>
          )}
        </div>
        <input placeholder="Service (e.g. Colour + Cut)" value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} />
        <label className="privacy-check">
          <input type="checkbox" checked={uninterrupted} onChange={(e) => setUninterrupted(e.target.checked)} />
          Keep this private — no one else squeezed in during any downtime
        </label>
      </div>

      <div className="step">
        <div className="step-head">
          <span className="step-num">2</span>
          <b>How long will it take?</b>
        </div>
        {recall && (
          <button type="button" className="recall-hint" onClick={() => applyRecall(recall)}>
            <ClockCounterClockwise />
            <span>
              Last time — {recall.serviceLabel}: <b>{durationLabel(appointmentDuration(recall))}</b>. Use this?
            </span>
          </button>
        )}
        <div className="mode-switch">
          <button type="button" className={!multiStep ? "active" : ""} onClick={() => toggleMultiStep(false)}>
            <Scissors /> Simple
          </button>
          <button type="button" className={multiStep ? "active" : ""} onClick={() => toggleMultiStep(true)}>
            <Clock /> Includes processing time
          </button>
        </div>
        {!multiStep ? (
          <>
            <div className="quick-row">
              {quickDurations.map((d) => (
                <button key={d} className={duration === d ? "active" : ""} onClick={() => pickDuration(d)}>
                  {d === 45 ? "45 min" : durationLabel(d)}
                </button>
              ))}
            </div>
            <div className="manual-label">
              <span>Or enter manually</span>
              <span>5-minute steps</span>
            </div>
            <div className="manual-time">
              <label>
                <input type="number" min="0" max="12" value={hours} onChange={(e) => setHours(+e.target.value)} />
                <span>hours</span>
              </label>
              <label>
                <input type="number" min="0" max="55" step="5" value={minutes} onChange={(e) => setMinutes(Math.round(+e.target.value / 5) * 5)} />
                <span>min</span>
              </label>
              <button onClick={applyManual}><Check /></button>
            </div>
            <button className="primary wide" onClick={applyManual}>Use this duration</button>
          </>
        ) : (
          <div className="stage-editor">
            <p className="stage-editor-hint">Like Anna's colour appointment: you work, then wait while it processes (free to help someone else), then finish up.</p>
            <div className="stage-row">
              <span>You&rsquo;re working</span>
              <input type="number" min="5" step="5" value={stageA} onChange={(e) => handleStageChange("a", e.target.value)} />
              <span>min</span>
            </div>
            <div className="stage-row free">
              <span>Then it processes — you&rsquo;re free</span>
              <input type="number" min="5" step="5" value={stageB} onChange={(e) => handleStageChange("b", e.target.value)} />
              <span>min</span>
            </div>
            <div className="stage-row">
              <span>Then you finish up</span>
              <input type="number" min="5" step="5" value={stageC} onChange={(e) => handleStageChange("c", e.target.value)} />
              <span>min</span>
            </div>
            <p className="stage-total">Total: {durationLabel(stageA + stageB + stageC)}</p>
          </div>
        )}
      </div>

      <div className="step">
        <div className="step-head">
          <span className="step-num">3</span>
          <b>Pick a time</b>
        </div>
        <div className="suggested">
          <small>{durationLabel(duration)} · double-booking opportunities marked</small>
          {prefill?.slot && selectedSlot?.pinned && (
            <button className="selected-slot pinned" onClick={() => setSelectedSlot(selectedSlot)}>
              <MapPinLine />
              <span>
                <b>{formatDayLabel(selectedSlot.date)} · {formatRange(selectedSlot.startMin, selectedSlot.endMin)}</b>
                <small>{prefill.slot.context ? `From the calendar — ${prefill.slot.context}` : "From the calendar"}</small>
              </span>
              <em>Selected</em>
            </button>
          )}
          {slots.length === 0 && <p className="empty-hint">Nothing open in the next two weeks.</p>}
          {slots.map((s, i) => {
            const isSelected = selectedSlot && !selectedSlot.pinned && selectedSlot.date === s.date && selectedSlot.startMin === s.startMin;
            const overlapClient = s.overlap ? clients.find((c) => c.id === s.overlap.clientId) : null;
            return (
              <button key={i} className={isSelected ? "selected-slot" : ""} onClick={() => setSelectedSlot({ ...s })}>
                {overlapClient ? <Stack /> : <Sparkle />}
                <span>
                  <b>{formatDayLabel(s.date)} · {formatRange(s.startMin, s.endMin)}</b>
                  <small>{overlapClient ? `Fits during ${overlapClient.name}'s ${s.overlap.stageLabel.toLowerCase()}` : "Genuinely open"}</small>
                </span>
                {i === 0 && !overlapClient && <em>Best fit</em>}
                <CaretRight />
              </button>
            );
          })}
        </div>

        {/* The other real phone call: "book me at exactly 3pm Tuesday" — a specific request that
            has to fit even if it means overlapping someone. Not restricted to genuinely open
            slots like the search above; the conflict warning below covers the rest. */}
        <div className="exact-time">
          <small>Or asked for an exact day and time?</small>
          <div className="exact-time-row">
            <input type="date" value={exactDate} onChange={(e) => setExactDate(e.target.value)} />
            <input type="time" step="300" value={exactTime} onChange={(e) => setExactTime(e.target.value)} />
            <button type="button" onClick={useExactTime}>Use this time</button>
          </div>
        </div>

        {previewConflict && (
          <div className="conflict-preview">
            <WarningCircle />
            <span>
              Overlaps with <b>{previewConflictClient?.name ?? "another client"}</b>'s {previewConflict.serviceLabel}. You can still book it — drag one of them to a clear time afterward.
            </span>
          </div>
        )}
      </div>

      <div className="assistant-footer">
        <small>{clientQuery.trim() ? `Booking for ${clientQuery.trim()}.` : "No name yet? Book anyway — you'll be walked straight to adding it."}</small>
        <button className="primary" disabled={!selectedSlot} onClick={confirm}>Book appointment</button>
      </div>
    </aside>
  );
}
