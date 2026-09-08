// Best-effort parser for text pasted straight from a Weebly "Order Details"
// admin page. This is heuristic, not a real integration — it looks for the
// same section headings Weebly's order page uses ("Delivery Address",
// "Contact information", "Billing Details", etc.) and pulls out whatever it
// can find nearby. It will not be perfect on every order, which is why the
// quick-add page always shows the result in an editable form before saving
// anything — nothing gets created without a human glancing over it first.
export function parseWeeblyOrderText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result = {
    orderReference: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    billingName: "",
    billingEmail: "",
    samples: "",
  };

  const findIndex = (re, from = 0) => {
    for (let i = from; i < lines.length; i++) {
      if (re.test(lines[i])) return i;
    }
    return -1;
  };

  // Order number, e.g. "Order #988654052"
  const orderMatch = text.match(/Order\s*#\s*(\d+)/i);
  if (orderMatch) result.orderReference = orderMatch[1];

  // Item list: everything between the items table header and "Subtotal:"
  const itemsStart = findIndex(/^Item\b.*Qty.*Total|^Item\b/i);
  const subtotalIdx = findIndex(/^Subtotal:/i);
  if (itemsStart !== -1 && subtotalIdx !== -1 && subtotalIdx > itemsStart) {
    result.samples = lines.slice(itemsStart + 1, subtotalIdx).join(" | ");
  }

  // Delivery Address block: name on the first line, remaining lines (until
  // "Contact information") form the address.
  const deliveryIdx = findIndex(/Delivery Address/i);
  const contactIdx = deliveryIdx !== -1 ? findIndex(/Contact information/i, deliveryIdx) : -1;
  if (deliveryIdx !== -1) {
    const blockEnd = contactIdx !== -1 ? contactIdx : Math.min(deliveryIdx + 6, lines.length);
    const block = lines.slice(deliveryIdx + 1, blockEnd);
    if (block.length > 0) {
      result.name = block[0];
      result.address = block.slice(1).join(", ");
    }
  }

  // Phone/email sitting under "Contact information", above "Billing Details"
  if (contactIdx !== -1) {
    const billingIdx = findIndex(/Billing Details/i, contactIdx);
    const block = lines.slice(contactIdx + 1, billingIdx !== -1 ? billingIdx : contactIdx + 5);
    for (const line of block) {
      if (/@/.test(line) && !result.email) result.email = line;
      else if (/^[\d+()\s-]{7,}$/.test(line) && !result.phone) result.phone = line;
    }
  }

  // Billing Address name — often a different person to the delivery name
  // (e.g. one person's PayPal, another's delivery address). Kept separately
  // rather than overwriting the delivery name.
  const billingAddrIdx = findIndex(/Billing Address/i);
  if (billingAddrIdx !== -1 && lines[billingAddrIdx + 1]) {
    result.billingName = lines[billingAddrIdx + 1];
  }

  // Billing email is usually written as "Email: someone@example.com"
  const billingEmailMatch = text.match(/Email:\s*([^\s]+@[^\s]+)/i);
  if (billingEmailMatch) result.billingEmail = billingEmailMatch[1];

  return result;
}
