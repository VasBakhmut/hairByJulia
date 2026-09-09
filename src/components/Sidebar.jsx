import { useState } from "react";
import { CalendarBlank, CaretDown, ChatCircleDots, CurrencyDollar, Users } from "@phosphor-icons/react";
import { useAppActions, useAppState } from "../store/AppContext.jsx";

const nav = [
  { icon: CalendarBlank, label: "Calendar", page: "calendar", onSelect: (actions) => actions.setPage("calendar") },
  { icon: Users, label: "Clients", page: "clients", onSelect: (actions) => actions.setPage("clients") },
  { icon: ChatCircleDots, label: "Messages", page: "messages", onSelect: (actions) => actions.setPage("messages") },
  { icon: CurrencyDollar, label: "Finances", page: "finance", onSelect: (actions) => actions.setPage("finance") },
];

export function Sidebar() {
  const { ui } = useAppState();
  const actions = useAppActions();
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <aside className="sidebar">
      <div className="brand">
        HairByJulia<span>Julia</span>
      </div>
      <nav>
        {nav.map(({ icon: Icon, label, page, onSelect }) => (
          <button key={label} className={ui.page === page ? "active" : ""} onClick={() => onSelect(actions)}>
            <Icon size={20} weight="regular" />
            {label}
          </button>
        ))}
      </nav>
      <div className="profile">
        <div className="avatar">J</div>
        <div>
          <b>Julia</b>
          <small>Owner</small>
        </div>
        <CaretDown size={15} />
      </div>

      {!confirmingReset ? (
        <button className="reset-demo" onClick={() => setConfirmingReset(true)}>
          Reset demo data
        </button>
      ) : (
        <div className="reset-demo-confirm">
          <small>Clear everything you've added and start fresh?</small>
          <div>
            <button onClick={() => setConfirmingReset(false)}>Cancel</button>
            <button
              className="danger"
              onClick={() => {
                actions.resetDemoData();
                setConfirmingReset(false);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
