// Julia's real service menu — powers the autocomplete in step 1 of the booking assistant, the
// same way client names do. Prices are shown in the dropdown as a hint, never inserted into the
// booked service label itself (keeps the calendar card text short — "Balayage Full Head", not
// "Balayage Full Head — from $300").
export const SERVICE_CATALOG = [
  {
    category: "Styling",
    items: [
      { name: "Ladies Hair Cut & Blowave", price: "from $95" },
      { name: "Wash and Blowave", price: "from $65" },
      { name: "Wash and Dry Off", price: "from $35" },
      { name: "Wash", price: "$20" },
      { name: "Fringe Cut", price: "from $15" },
      { name: "Weddings and Up Styling", price: "POA" },
    ],
  },
  {
    category: "Colour",
    items: [
      { name: "Foils ¼ Head", price: "from $140" },
      { name: "Foils ½ Head", price: "from $195" },
      { name: "Foils ¾ Head", price: "from $240" },
      { name: "Foils Full Head", price: "from $280" },
      { name: "Balayage Full Head", price: "from $300" },
      { name: "Regrowth Tint", price: "from $95" },
      { name: "Full Head Colour", price: "from $140" },
      { name: "Toner", price: "from $35" },
      { name: "Semi-Permanent", price: "from $120" },
    ],
  },
  {
    category: "Treatments",
    items: [
      { name: "Express Treatment", price: "$45" },
      { name: "Keratin", price: "$550" },
    ],
  },
];

export const ALL_SERVICES = SERVICE_CATALOG.flatMap((group) => group.items.map((item) => ({ ...item, category: group.category })));
