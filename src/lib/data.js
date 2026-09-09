// Seed data for the prototype — entirely in-memory/mock, regenerated fresh on every load.
// Keeps the exact "today" story from the approved visual mock (Anna's phased balayage,
// Vasya + Maria squeezed into her processing time, Susan's private colour, Natalie's
// cancellation, Olivia's proposed + confirmed blow-dries) and extends it across two weeks
// with a fuller client roster and history so every screen has something real to show.

import { addDays, NOW, dateKey } from "./format.js";

let stageSeq = 0;
function stage(label, durationMin, occupiesStylist) {
  stageSeq += 1;
  return { id: `stage-${stageSeq}`, label, durationMin, occupiesStylist };
}
function single(durationMin, label = "Service") {
  return [stage(label, durationMin, true)];
}

export function seedData() {
  const today = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
  const day = (offset) => dateKey(addDays(today, offset));
  const ago = (days) => dateKey(addDays(today, -days));

  // ---------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------
  const clients = [
    {
      id: "client-anna",
      name: "Anna",
      phone: "(415) 555-0142",
      email: "anna@email.com",
      generalNotes: "Thick, long hair — allow extra processing time. Always brings iced coffee.",
      prefersPrivate: false,
      visits: [
        { id: "v-anna-1", date: ago(28), service: "Colour + Cut", formula: "Full balayage refresh: Olaplex No.1 + Blondor 30vol, open-air paint face-frame + mid-lengths. Toner: Color Touch 8/81 + 1.9%, 10 min. Dry cut, blunt ends." },
        { id: "v-anna-2", date: ago(56), service: "Full Balayage + Gloss", formula: "Same lift (Blondor 30vol). Toner adjusted: 8/81 + 8/1 equal parts, 1.9% dev, 10 min — wanted slightly cooler this time." },
        { id: "v-anna-3", date: ago(91), service: "Root Shadow + Gloss", formula: "Root shadow 7CB, 20vol, 25 min. Overall gloss 8N, 20 min." },
        { id: "v-anna-4", date: ago(133), service: "Colour Correction — Session 2", formula: "Filled porous mid-lengths with 7CB before glossing. Overall gloss 8N, 20 min. Ends still slightly warm — session 3 to even out." },
        { id: "v-anna-5", date: ago(154), service: "Colour Correction — Session 1", formula: "Came in with box-dye buildup, uneven and brassy. Soap-capped x2. Did NOT lift further — filled with 7CB. Re-eval in 3 weeks." },
        { id: "v-anna-6", date: ago(210), service: "Consultation", formula: "First visit. Box-dye history, roots ~2in natural level 5, brassy orange ends. Agreed a 3-session correction plan rather than rushing it." },
      ],
    },
    {
      id: "client-vasya",
      name: "Vasya",
      phone: "(415) 555-0121",
      email: "vasya@email.com",
      generalNotes: "Wants grey blended, not covered — keep it subtle and natural.",
      prefersPrivate: false,
      visits: [
        { id: "v-vasya-1", date: ago(24), service: "Haircut", formula: "No colour today, scissor cut only. Short back and sides, textured top." },
        { id: "v-vasya-2", date: ago(52), service: "Men's Grey Blend + Cut", formula: "Colour Fresh 6/0, brush-through (no foils), 15 min, no lightener. Subtle, not full coverage. Scissor cut after." },
      ],
    },
    {
      id: "client-maria",
      name: "Maria",
      phone: "(415) 555-0163",
      email: "maria@email.com",
      generalNotes: "No colour, ever — cut & style only. Likes to be in and out fast, a good filler between colour clients.",
      prefersPrivate: false,
      visits: [
        { id: "v-maria-1", date: ago(18), service: "Cut & Style", formula: "No colour. Dry cut, point-cut ends to soften, low-diffuse blowout." },
        { id: "v-maria-2", date: ago(60), service: "Fringe Trim", formula: "Quick fringe trim only, blunt cut just above brow." },
      ],
    },
    {
      id: "client-susan",
      name: "Susan",
      phone: "(415) 555-0134",
      email: "susan@email.com",
      generalNotes: "Prefers Julia's full, undivided attention — never double-book her processing time.",
      prefersPrivate: true,
      visits: [
        { id: "v-susan-1", date: ago(30), service: "Private Colour", formula: "Full head, Koleston Perfect 6/71 + 6/0 equal parts, 20vol, 35 min. Temples need an extra 5 min — resistant grey there." },
        { id: "v-susan-2", date: ago(70), service: "Foil Highlights", formula: "Half-head foils, Blondor 30vol, 18 foils. Toner 9/16 + 10vol, 7 min — pulled slightly violet, dialed back time next visit." },
      ],
    },
    {
      id: "client-natalie",
      name: "Natalie",
      phone: "(415) 555-0158",
      email: "natalie@email.com",
      generalNotes: "Reschedules often — always offer the next open slot by text.",
      prefersPrivate: false,
      visits: [
        { id: "v-natalie-1", date: ago(35), service: "Cut & Style", formula: "Dry cut, layers refreshed, round-brush blowout." },
      ],
    },
    {
      id: "client-olivia",
      name: "Olivia",
      phone: "(415) 555-0187",
      email: "olivia@email.com",
      generalNotes: "Vivid colour client — very colour-conscious, brings reference photos every time. Hair is pre-lightened, treat gently.",
      prefersPrivate: false,
      visits: [
        { id: "v-olivia-1", date: ago(14), service: "Toner Refresh", formula: "Deposit-only lilac + smoke, no lightener, 10 min. Faded evenly, easy refresh." },
        { id: "v-olivia-2", date: ago(49), service: "Vivid Fashion Colour", formula: "Bleached to level 9-10, Blondorplex 20vol, two rounds ~20 min each. Toned pastel base lilac + smoke, 10 min. Fashion layer cobalt + violet on pre-lightened ends." },
      ],
    },
    {
      id: "client-daria",
      name: "Daria",
      phone: "(415) 555-0199",
      email: "daria@email.com",
      generalNotes: "Sensitive scalp — keep lightener off the roots, apply 1cm away.",
      prefersPrivate: false,
      visits: [
        { id: "v-daria-1", date: ago(21), service: "Root Touch-Up", formula: "Shades EQ 6NA + 6N equal parts, 20vol. Roots only, 20 min, no heat." },
        { id: "v-daria-2", date: ago(49), service: "Root Touch-Up", formula: "Same as usual: 6NA/6N 1:1, 20vol. Processed 20 min. Scalp fine this time." },
        { id: "v-daria-3", date: ago(98), service: "Full Head Colour", formula: "Full head refresh before a wedding: 6NA overall, 20vol, 30 min." },
      ],
    },
    {
      id: "client-ivan",
      name: "Ivan",
      phone: "(415) 555-0176",
      email: "ivan@email.com",
      generalNotes: "Quiet, quick appointments — not much small talk, just wants a subtle grey blend.",
      prefersPrivate: false,
      visits: [
        { id: "v-ivan-1", date: ago(24), service: "Men's Grey Blend", formula: "Colour Fresh 6/0, brush through, 15 min, no lightener." },
      ],
    },
  ];

  const colorIndexByClient = new Map(clients.map((c, i) => [c.id, i % 6]));

  // ---------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------
  let apptSeq = 0;
  function appt({ clientId, date, startMin, serviceLabel, stages, allowParallelBooking = true, lane = "primary", status = "confirmed", reminderSentAt = null }) {
    apptSeq += 1;
    return {
      id: `appt-${apptSeq}`,
      clientId,
      date,
      startMin,
      serviceLabel,
      stages,
      allowParallelBooking,
      lane,
      status,
      colorIndex: colorIndexByClient.get(clientId) ?? 0,
      reminderSentAt,
      // Every seeded booking was already auto-confirmed when it was made, same as a live one
      // created through the app would be.
      confirmationSentAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
    };
  }

  const remindedAgo = (hours) => new Date(NOW.getTime() - hours * 3600 * 1000).toISOString();

  const appointments = [
    // ---- History (past days) — powers the "last time this took X" booking suggestion. Anna's
    // hair genuinely needs longer processing than the generic duration chips assume, which is
    // exactly the case this is meant to demonstrate. ----
    appt({
      clientId: "client-anna",
      date: ago(28),
      startMin: 9 * 60,
      serviceLabel: "Colour + Cut",
      stages: [stage("Hands-on", 75, true), stage("Processing / open", 180, false), stage("Hands-on", 45, true)],
    }),
    appt({ clientId: "client-vasya", date: ago(24), startMin: 10 * 60, serviceLabel: "Haircut", stages: single(45, "Hands-on") }),

    // ---- Today: the approved mock's exact story ----
    appt({
      clientId: "client-anna",
      date: day(0),
      startMin: 9 * 60,
      serviceLabel: "Colour + Cut",
      allowParallelBooking: true,
      reminderSentAt: remindedAgo(18),
      // Three stages, same shape the booking flow itself builds (work → processing → finish) —
      // the span (60 + 195 + 45 = 300min = 9:00-2:00) is unchanged from before so Vasya's and
      // Maria's squeezed-in bookings below still land cleanly inside the single open window.
      stages: [stage("Hands-on", 60, true), stage("Processing / open", 195, false), stage("Hands-on", 45, true)],
    }),
    appt({ clientId: "client-vasya", date: day(0), startMin: 10 * 60, serviceLabel: "Haircut", lane: "parallel", stages: single(90, "Hands-on") }),
    appt({ clientId: "client-maria", date: day(0), startMin: 12 * 60 + 5, serviceLabel: "Haircut", lane: "parallel", stages: single(60, "Hands-on") }),
    appt({ clientId: "client-susan", date: day(0), startMin: 14 * 60 + 15, serviceLabel: "Private Colour", allowParallelBooking: false, stages: single(150, "Hands-on") }),
    appt({ clientId: "client-natalie", date: day(0), startMin: 17 * 60, serviceLabel: "Cut", status: "cancelled", stages: single(45, "Hands-on") }),
    appt({ clientId: "client-olivia", date: day(0), startMin: 17 * 60 + 15, serviceLabel: "Blow Dry", status: "proposed", stages: single(45, "Hands-on") }),
    appt({ clientId: "client-daria", date: day(0), startMin: 18 * 60, serviceLabel: "Blow Dry", reminderSentAt: remindedAgo(3), stages: single(45, "Hands-on") }),

    // ---- Tomorrow ----
    appt({ clientId: "client-ivan", date: day(1), startMin: 9 * 60 + 30, serviceLabel: "Men's Grey Blend", stages: single(25, "Hands-on") }),
    appt({
      clientId: "client-daria",
      date: day(1),
      startMin: 11 * 60,
      serviceLabel: "Root Touch-Up",
      stages: [stage("Hands-on", 25, true), stage("Processing / open", 35, false), stage("Hands-on", 25, true)],
    }),
    appt({ clientId: "client-vasya", date: day(1), startMin: 11 * 60 + 30, serviceLabel: "Fringe Trim", lane: "parallel", stages: single(30, "Hands-on") }),

    // ---- Day 2 ----
    appt({ clientId: "client-maria", date: day(2), startMin: 9 * 60, serviceLabel: "Cut & Style", stages: single(45, "Hands-on") }),
    // A processing window nobody's booked into yet — a live double-booking opportunity that
    // should surface near the top of the smart search, not buried past today's fully-used ones.
    appt({
      clientId: "client-olivia",
      date: day(2),
      startMin: 10 * 60,
      serviceLabel: "Root Touch-Up",
      stages: [stage("Hands-on", 25, true), stage("Processing / open", 50, false), stage("Hands-on", 25, true)],
    }),

    // ---- Day 3 ----
    appt({
      clientId: "client-anna",
      date: day(3),
      startMin: 13 * 60,
      serviceLabel: "Full Balayage",
      stages: [stage("Hands-on", 50, true), stage("Processing / open", 40, false), stage("Hands-on", 35, true)],
    }),
    appt({ clientId: "client-maria", date: day(3), startMin: 13 * 60 + 55, serviceLabel: "Fringe Trim", lane: "parallel", stages: single(30, "Hands-on") }),
    appt({ clientId: "client-susan", date: day(3), startMin: 16 * 60, serviceLabel: "Blow Dry", allowParallelBooking: false, stages: single(45, "Hands-on") }),

    // ---- Day 4: intentionally open ----

    // ---- Day 5 ----
    appt({ clientId: "client-daria", date: day(5), startMin: 10 * 60, serviceLabel: "Toner Refresh", stages: single(30, "Hands-on") }),

    // ---- Day 6: intentionally open ----

    // ---- Day 7 ----
    appt({
      clientId: "client-anna",
      date: day(7),
      startMin: 9 * 60,
      serviceLabel: "Root Shadow + Gloss",
      stages: [stage("Hands-on", 25, true), stage("Processing / open", 30, false), stage("Hands-on", 25, true)],
    }),
    appt({ clientId: "client-ivan", date: day(7), startMin: 9 * 60 + 30, serviceLabel: "Grey Touch-Up", lane: "parallel", stages: single(25, "Hands-on") }),
    appt({ clientId: "client-maria", date: day(7), startMin: 11 * 60, serviceLabel: "Cut & Style", stages: single(45, "Hands-on") }),

    // ---- Day 8: intentionally open ----

    // ---- Day 9 ----
    appt({
      clientId: "client-olivia",
      date: day(9),
      startMin: 10 * 60,
      serviceLabel: "Vivid Colour Refresh",
      stages: [stage("Hands-on (bleach)", 40, true), stage("Processing / open", 30, false), stage("Hands-on (tone)", 15, true), stage("Processing / open", 20, false), stage("Hands-on (wash & style)", 30, true)],
    }),

    // ---- Day 11 ----
    appt({
      clientId: "client-daria",
      date: day(11),
      startMin: 13 * 60,
      serviceLabel: "Root Touch-Up",
      stages: [stage("Hands-on", 25, true), stage("Processing / open", 35, false), stage("Hands-on", 25, true)],
    }),
    appt({ clientId: "client-ivan", date: day(11), startMin: 13 * 60 + 30, serviceLabel: "Men's Grey Blend", lane: "parallel", stages: single(25, "Hands-on") }),

    // ---- Day 13 ----
    appt({ clientId: "client-maria", date: day(13), startMin: 10 * 60, serviceLabel: "Cut & Style", stages: single(45, "Hands-on") }),
  ];

  // ---------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------
  let txSeq = 0;
  function tx(input) {
    txSeq += 1;
    return { id: `tx-${txSeq}`, ...input };
  }
  const isoAt = (offsetDays, hour, minute = 0) => {
    const d = addDays(today, offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const transactions = [
    tx({ date: isoAt(-7, 15, 10), amount: 245, method: "card", clientId: "client-anna", note: "Full balayage + gloss" }),
    tx({ date: isoAt(-6, 11, 40), amount: 95, method: "cash", clientId: "client-susan", note: "Private colour" }),
    tx({ date: isoAt(-5, 14, 30), amount: 60, method: "card", clientId: "client-daria", note: "Root touch-up" }),
    tx({ date: isoAt(-4, 16, 0), amount: 40, method: "cash", clientId: "client-maria", note: "Cut & style" }),
    tx({ date: isoAt(-3, 10, 45), amount: 220, method: "card", clientId: "client-anna", note: "Colour correction session" }),
    tx({ date: isoAt(-2, 12, 0), amount: 55, method: "card", clientId: "client-ivan", note: "Grey blend + cut" }),
    tx({ date: isoAt(-1, 17, 15), amount: 210, method: "card", clientId: "client-olivia", note: "Vivid fashion colour" }),
    tx({ date: isoAt(-1, 18, 0), amount: 32, method: "cash", note: "Retail — Olaplex No.7" }),
    tx({ date: isoAt(0, 8, 45), amount: 15, method: "cash", note: "Tip jar" }),
  ];

  // ---------------------------------------------------------------------
  // Messages — SMS-style conversation history, mocked. Auto-confirmations and
  // reminders show up here alongside a couple of seeded replies so the
  // "conversation" view has real back-and-forth on day one, not an empty inbox.
  // ---------------------------------------------------------------------
  let msgSeq = 0;
  function msg({ clientId, direction, text, sentAt, kind = "custom" }) {
    msgSeq += 1;
    return { id: `msg-${msgSeq}`, clientId, direction, text, sentAt, kind };
  }

  const messages = [
    msg({ clientId: "client-anna", direction: "out", kind: "confirmation", sentAt: remindedAgo(20), text: "Hi Anna! You're confirmed for Colour + Cut today at 9:00 AM. See you soon — Julia" }),
    msg({ clientId: "client-anna", direction: "in", sentAt: remindedAgo(19.5), text: "Perfect, see you then!" }),
    msg({ clientId: "client-anna", direction: "out", kind: "reminder", sentAt: remindedAgo(18), text: "Reminder: your appointment is today at 9:00 AM. Reply if you need to reschedule." }),

    msg({ clientId: "client-daria", direction: "out", kind: "confirmation", sentAt: remindedAgo(30), text: "Hi Daria! You're confirmed for Blow Dry today at 6:00 PM. See you soon — Julia" }),
    msg({ clientId: "client-daria", direction: "out", kind: "reminder", sentAt: remindedAgo(3), text: "Reminder: your appointment is today at 6:00 PM. Reply if you need to reschedule." }),
    msg({ clientId: "client-daria", direction: "in", sentAt: remindedAgo(2.8), text: "Thank you for the reminder!" }),

    msg({ clientId: "client-susan", direction: "out", kind: "confirmation", sentAt: remindedAgo(40), text: "Hi Susan! You're confirmed for Private Colour today at 2:15 PM. See you soon — Julia" }),

    // Every other today/tomorrow booking gets at least its confirmation, same as a real
    // booking made through the app would — otherwise they'd be missing from the message
    // list entirely, which would look like a bug rather than "no conversation yet".
    msg({ clientId: "client-vasya", direction: "out", kind: "confirmation", sentAt: remindedAgo(22), text: "Hi Vasya! You're confirmed for Haircut today at 10:00 AM. See you soon — Julia" }),
    msg({ clientId: "client-maria", direction: "out", kind: "confirmation", sentAt: remindedAgo(15), text: "Hi Maria! You're confirmed for Haircut today at 12:05 PM. See you soon — Julia" }),
    msg({ clientId: "client-ivan", direction: "out", kind: "confirmation", sentAt: remindedAgo(9), text: "Hi Ivan! You're confirmed for Men's Grey Blend tomorrow at 9:30 AM. See you soon — Julia" }),
  ];

  return { clients, appointments, transactions, messages };
}
