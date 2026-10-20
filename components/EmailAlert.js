"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MailWarning } from "lucide-react";

// Small banner on the dashboard: how many emailed enquiries are still
// waiting for a reply. It fails silently (shows nothing) if the email
// feature isn't set up yet, so it can never get in the way of the dashboard.
export default function EmailAlert() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/email/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || !data.waiting) return null;
  return (
    <Link href="/inbox" className="hp-email-alert">
      <MailWarning size={17} />
      {data.waiting} emailed {data.waiting === 1 ? "enquiry is" : "enquiries are"} waiting for a reply
      {data.overdue ? ` — ${data.overdue} waiting 3+ days` : ""}
    </Link>
  );
}
