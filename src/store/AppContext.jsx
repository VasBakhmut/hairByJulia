import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { seedData } from "../lib/data.js";
import { dateKey, NOW, formatClock, formatShortDate } from "../lib/format.js";

const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const STORAGE_KEY = "hairbyjulia-prototype-data-v2";

function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.clients) || !Array.isArray(parsed.appointments)) return null;
    // The seed story ("today" has Anna, Vasya, ...) is anchored to whatever real Melbourne day
    // it was first generated on. Once that day has passed, treat it as stale and reseed fresh
    // against today — otherwise "today" would quietly show nothing every time the calendar
    // date actually advances. Same-day additions (new clients/bookings) still persist fine.
    if (parsed.seedDateKey !== dateKey(NOW)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full/unavailable (private browsing etc.) — the demo still works in-memory.
  }
}

function freshData() {
  const seed = seedData();
  return { clients: seed.clients, appointments: seed.appointments, transactions: seed.transactions, messages: seed.messages, seedDateKey: dateKey(NOW) };
}

function initialState() {
  const persisted = loadPersisted();
  const data = persisted ?? freshData();
  return {
    ...data,
    ui: {
      page: "calendar", // 'calendar' | 'clients' | 'finance' | 'messages'
      view: "Day", // 'Day' | '3 Days' | 'Week' | 'Month'
      selectedDate: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()),
      assistantOpen: true,
      assistantPrefill: null,
      clientPanelId: null,
      addClientOpen: false,
      threadClientId: null,
      selectedAppointmentId: null,
      placementMode: null,
      scrollToAppointmentId: null,
      dragPreview: null, // { dayKey, startMin, endMin } while a card is being dragged — lets
      // DayView draw one shared guide line across the whole grid, not just under the card.
      toast: "",
    },
  };
}

function confirmationMessageFor(client, appt) {
  return `Hi ${client.name}! You're confirmed for ${appt.serviceLabel} on ${formatShortDate(appt.date)} at ${formatClock(appt.startMin)}. See you soon — Julia`;
}
function reminderMessageFor(appt) {
  return `Reminder: your appointment is at ${formatClock(appt.startMin)}. Reply if you need to reschedule.`;
}

function reducer(state, action) {
  switch (action.type) {
    case "ADD_APPOINTMENT": {
      const clientIdx = Math.max(0, state.clients.findIndex((c) => c.id === action.payload.clientId));
      const client = state.clients[clientIdx];
      const appt = {
        id: action.payload.id,
        clientId: action.payload.clientId,
        date: action.payload.date,
        startMin: action.payload.startMin,
        serviceLabel: action.payload.serviceLabel,
        stages: action.payload.stages.map((s) => ({ ...s, id: uid("stage") })),
        allowParallelBooking: action.payload.allowParallelBooking ?? true,
        lane: action.payload.lane ?? "primary",
        status: "confirmed",
        colorIndex: clientIdx % 6,
        reminderSentAt: null,
        confirmationSentAt: NOW.toISOString(),
        createdAt: NOW.toISOString(),
      };
      // Booking auto-sends (and logs) a confirmation message — this is the thing we need to
      // be able to show Julia is actually tracked, not just implied.
      const confirmation = {
        id: uid("msg"),
        clientId: appt.clientId,
        direction: "out",
        kind: "confirmation",
        text: client ? confirmationMessageFor(client, appt) : "You're confirmed.",
        sentAt: NOW.toISOString(),
      };
      return { ...state, appointments: [...state.appointments, appt], messages: [...state.messages, confirmation] };
    }
    case "RESCHEDULE_APPOINTMENT":
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.payload.id ? { ...a, date: action.payload.date, startMin: action.payload.startMin } : a
        ),
      };
    case "TOGGLE_PARALLEL":
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.payload.id ? { ...a, allowParallelBooking: !a.allowParallelBooking } : a
        ),
      };
    case "CANCEL_APPOINTMENT":
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.payload.id ? { ...a, status: "cancelled" } : a)),
      };
    case "RESTORE_APPOINTMENT":
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.payload.id ? { ...a, status: "confirmed" } : a)),
      };
    case "SEND_REMINDER": {
      const appt = state.appointments.find((a) => a.id === action.payload.id);
      if (!appt) return state;
      const reminder = { id: uid("msg"), clientId: appt.clientId, direction: "out", kind: "reminder", text: reminderMessageFor(appt), sentAt: NOW.toISOString() };
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.payload.id ? { ...a, reminderSentAt: NOW.toISOString() } : a)),
        messages: [...state.messages, reminder],
      };
    }

    case "ADD_CLIENT": {
      const client = {
        id: action.payload.id,
        name: action.payload.name,
        phone: action.payload.phone || "—",
        email: action.payload.email || "",
        generalNotes: "",
        prefersPrivate: action.payload.prefersPrivate ?? false,
        visits: [],
      };
      return { ...state, clients: [...state.clients, client] };
    }
    case "UPDATE_CLIENT_NOTES":
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.clientId ? { ...c, generalNotes: action.payload.notes } : c)),
      };
    case "UPDATE_CLIENT_INFO":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.payload.clientId ? { ...c, name: action.payload.name, phone: action.payload.phone, email: action.payload.email } : c
        ),
      };
    case "SET_CLIENT_PRIVATE":
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.clientId ? { ...c, prefersPrivate: action.payload.value } : c)),
      };
    case "ADD_VISIT": {
      const visit = { id: action.payload.id, date: action.payload.date, service: action.payload.service, formula: action.payload.formula };
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.payload.clientId ? { ...c, visits: [visit, ...c.visits] } : c)),
      };
    }
    case "UPDATE_VISIT":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id !== action.payload.clientId
            ? c
            : { ...c, visits: c.visits.map((v) => (v.id === action.payload.visitId ? { ...v, ...action.payload.patch } : v)) }
        ),
      };

    case "ADD_TRANSACTION":
      return { ...state, transactions: [{ id: uid("tx"), ...action.payload }, ...state.transactions] };

    case "SEND_MESSAGE": {
      const now = NOW.toISOString();
      const newMessages = action.payload.clientIds.map((clientId) => ({
        id: uid("msg"),
        clientId,
        direction: "out",
        kind: action.payload.kind ?? "custom",
        text: action.payload.text,
        sentAt: now,
      }));
      return { ...state, messages: [...state.messages, ...newMessages] };
    }

    case "RESET_DATA":
      return { ...freshData(), ui: { ...state.ui, clientPanelId: null, addClientOpen: false, threadClientId: null, assistantPrefill: null, placementMode: null } };

    case "SET_PAGE":
      return { ...state, ui: { ...state.ui, page: action.payload } };
    case "SET_VIEW":
      return {
        ...state,
        ui: {
          ...state.ui,
          view: action.payload,
          page: "calendar",
          // The assistant only makes sense alongside the single-day grid — multi-day views
          // get the full working width instead.
          assistantOpen: action.payload === "Day" ? state.ui.assistantOpen : false,
        },
      };
    case "SET_SELECTED_DATE":
      return { ...state, ui: { ...state.ui, selectedDate: action.payload } };
    case "OPEN_ASSISTANT":
      // The assistant only renders alongside the Day grid — force that view/page so "Find a
      // time" and "New booking" always visibly do something, no matter where you clicked them
      // from (this was the bug: clicking from Week/Month view opened it "invisibly").
      return { ...state, ui: { ...state.ui, page: "calendar", view: "Day", assistantOpen: true, assistantPrefill: action.payload ?? null } };
    case "CLOSE_ASSISTANT":
      return { ...state, ui: { ...state.ui, assistantOpen: false, assistantPrefill: null } };
    case "OPEN_CLIENT_PANEL":
      return { ...state, ui: { ...state.ui, clientPanelId: action.payload } };
    case "CLOSE_CLIENT_PANEL":
      return { ...state, ui: { ...state.ui, clientPanelId: null } };
    case "SET_ADD_CLIENT_OPEN":
      return { ...state, ui: { ...state.ui, addClientOpen: action.payload } };
    case "OPEN_THREAD":
      return { ...state, ui: { ...state.ui, threadClientId: action.payload } };
    case "CLOSE_THREAD":
      return { ...state, ui: { ...state.ui, threadClientId: null } };
    case "SELECT_APPOINTMENT":
      return { ...state, ui: { ...state.ui, selectedAppointmentId: action.payload } };
    case "START_PLACEMENT":
      return { ...state, ui: { ...state.ui, placementMode: action.payload, assistantOpen: false, assistantPrefill: null } };
    case "END_PLACEMENT":
      return { ...state, ui: { ...state.ui, placementMode: null } };
    case "SET_SCROLL_TARGET":
      return { ...state, ui: { ...state.ui, scrollToAppointmentId: action.payload } };
    case "SET_DRAG_PREVIEW":
      return { ...state, ui: { ...state.ui, dragPreview: action.payload } };
    case "TOAST":
      return { ...state, ui: { ...state.ui, toast: action.payload } };
    default:
      return state;
  }
}

const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // Persist the real data (never UI state — panels/selected date should always start fresh)
  // so Julia can try adding clients/appointments and still see them after a refresh.
  useEffect(() => {
    persist({ clients: state.clients, appointments: state.appointments, transactions: state.transactions, messages: state.messages, seedDateKey: state.seedDateKey });
  }, [state.clients, state.appointments, state.transactions, state.messages, state.seedDateKey]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

/** Bound action creators — the only way components should mutate state. */
export function useAppActions() {
  const dispatch = useContext(AppDispatchContext);
  if (!dispatch) throw new Error("useAppActions must be used within AppProvider");
  return useMemo(
    () => ({
      addAppointment: (payload) => {
        const id = uid("appt");
        dispatch({ type: "ADD_APPOINTMENT", payload: { ...payload, id } });
        return id;
      },
      rescheduleAppointment: (id, date, startMin) => dispatch({ type: "RESCHEDULE_APPOINTMENT", payload: { id, date, startMin } }),
      toggleParallel: (id) => dispatch({ type: "TOGGLE_PARALLEL", payload: { id } }),
      cancelAppointment: (id) => dispatch({ type: "CANCEL_APPOINTMENT", payload: { id } }),
      restoreAppointment: (id) => dispatch({ type: "RESTORE_APPOINTMENT", payload: { id } }),
      sendReminder: (id) => dispatch({ type: "SEND_REMINDER", payload: { id } }),

      addClient: (payload) => {
        const id = uid("client");
        dispatch({ type: "ADD_CLIENT", payload: { ...payload, id } });
        return id;
      },
      updateClientNotes: (clientId, notes) => dispatch({ type: "UPDATE_CLIENT_NOTES", payload: { clientId, notes } }),
      updateClientInfo: (clientId, info) => dispatch({ type: "UPDATE_CLIENT_INFO", payload: { clientId, ...info } }),
      setClientPrivate: (clientId, value) => dispatch({ type: "SET_CLIENT_PRIVATE", payload: { clientId, value } }),
      addVisit: (clientId, visit) => {
        const id = uid("visit");
        dispatch({ type: "ADD_VISIT", payload: { clientId, id, ...visit } });
        return id;
      },
      updateVisit: (clientId, visitId, patch) => dispatch({ type: "UPDATE_VISIT", payload: { clientId, visitId, patch } }),

      addTransaction: (payload) => dispatch({ type: "ADD_TRANSACTION", payload }),

      sendMessage: (clientIds, text, kind) => dispatch({ type: "SEND_MESSAGE", payload: { clientIds, text, kind } }),

      resetDemoData: () => dispatch({ type: "RESET_DATA" }),

      setPage: (page) => dispatch({ type: "SET_PAGE", payload: page }),
      setView: (view) => dispatch({ type: "SET_VIEW", payload: view }),
      setSelectedDate: (date) => dispatch({ type: "SET_SELECTED_DATE", payload: date }),
      openAssistant: (prefill) => dispatch({ type: "OPEN_ASSISTANT", payload: prefill }),
      closeAssistant: () => dispatch({ type: "CLOSE_ASSISTANT" }),
      openClientPanel: (clientId) => dispatch({ type: "OPEN_CLIENT_PANEL", payload: clientId }),
      closeClientPanel: () => dispatch({ type: "CLOSE_CLIENT_PANEL" }),
      setAddClientOpen: (open) => dispatch({ type: "SET_ADD_CLIENT_OPEN", payload: open }),
      openThread: (clientId) => dispatch({ type: "OPEN_THREAD", payload: clientId }),
      closeThread: () => dispatch({ type: "CLOSE_THREAD" }),
      selectAppointment: (id) => dispatch({ type: "SELECT_APPOINTMENT", payload: id }),
      startPlacement: (payload) => dispatch({ type: "START_PLACEMENT", payload }),
      endPlacement: () => dispatch({ type: "END_PLACEMENT" }),
      setScrollTarget: (id) => dispatch({ type: "SET_SCROLL_TARGET", payload: id }),
      setDragPreview: (preview) => dispatch({ type: "SET_DRAG_PREVIEW", payload: preview }),
      toast: (message) => dispatch({ type: "TOAST", payload: message }),
    }),
    [dispatch]
  );
}

/** Convenience: dispatch a toast that auto-clears. Call from an event handler, not render. */
export function useAnnounce() {
  const { toast } = useAppActions();
  return (message) => {
    toast(message);
    window.setTimeout(() => toast(""), 2400);
  };
}
