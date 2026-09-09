import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { AppProvider, useAppActions, useAppState } from "./store/AppContext.jsx";
import { refreshNow } from "./lib/format.js";
import { Sidebar } from "./components/Sidebar.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { DayView } from "./components/DayView.jsx";
import { MultiCalendar } from "./components/MultiCalendar.jsx";
import { MonthCalendar } from "./components/MonthCalendar.jsx";
import { FindTimeAssistant } from "./components/FindTimeAssistant.jsx";
import { ClientsView } from "./components/ClientsView.jsx";
import { ClientProfilePanel } from "./components/ClientProfilePanel.jsx";
import { AddClientModal } from "./components/AddClientModal.jsx";
import { FinanceView } from "./components/FinanceView.jsx";
import { MessagesView } from "./components/MessagesView.jsx";
import { MessageThreadModal } from "./components/MessageThreadModal.jsx";

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { ui } = useAppState();
  const actions = useAppActions();

  // Re-sample the real Australia/Melbourne clock every 30s and force a re-render, so the
  // current-time line, "sent Xm ago" labels, etc. stay live without needing a page refresh.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      refreshNow();
      tick((t) => t + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Clear the "just created" highlight a couple seconds after it's set — a light touch of
  // feedback, not something that needs to live in global state forever.
  useEffect(() => {
    if (!ui.scrollToAppointmentId) return;
    const t = window.setTimeout(() => actions.setScrollTarget(null), 2200);
    return () => window.clearTimeout(t);
  }, [ui.scrollToAppointmentId, actions]);

  const showAssistant = ui.page === "calendar" && ui.view === "Day" && ui.assistantOpen;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">
        {ui.page === "calendar" && <TopBar />}

        {ui.page === "calendar" && (
          <div className={`content ${showAssistant ? "" : "assistant-closed"}`}>
            {ui.view === "Day" ? (
              <DayView date={ui.selectedDate} />
            ) : ui.view === "Month" ? (
              <MonthCalendar date={ui.selectedDate} />
            ) : (
              <MultiCalendar view={ui.view} date={ui.selectedDate} />
            )}
            {showAssistant && <FindTimeAssistant />}
          </div>
        )}

        {ui.page === "clients" && <ClientsView />}
        {ui.page === "finance" && <FinanceView />}
        {ui.page === "messages" && <MessagesView />}
      </main>

      <ClientProfilePanel />
      <AddClientModal />
      <MessageThreadModal />

      {ui.toast && (
        <div className="toast">
          <Check /> {ui.toast}
        </div>
      )}
    </div>
  );
}
