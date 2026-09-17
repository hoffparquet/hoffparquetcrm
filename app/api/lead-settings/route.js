import { NextResponse } from "next/server";
import { getLeadSettings, saveLeadSettings, testApiKey } from "@/lib/companiesHouse";

// The Companies House key is never sent back to the browser. The page
// only needs to know whether one is saved, and enough of it to recognise
// which key it is.
function redact(settings) {
  const key = settings.companiesHouseKey || "";
  return {
    companiesHouseKeySet: !!key,
    companiesHouseKeyHint: key ? `…${key.slice(-4)}` : "",
    sendingDomain: settings.sendingDomain || "",
    dkimSelectors: settings.dkimSelectors || ["selector1", "selector2"],
  };
}

export async function GET() {
  const settings = await getLeadSettings();
  return NextResponse.json(redact(settings));
}

export async function PATCH(request) {
  const patch = await request.json();
  const next = {};

  // An empty string means "leave the saved key alone", so you can edit
  // the domain without retyping the key. Sending null clears it.
  if (typeof patch.companiesHouseKey === "string" && patch.companiesHouseKey.trim()) {
    next.companiesHouseKey = patch.companiesHouseKey.trim();
  } else if (patch.companiesHouseKey === null) {
    next.companiesHouseKey = "";
  }

  if (typeof patch.sendingDomain === "string") {
    next.sendingDomain = patch.sendingDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
  if (Array.isArray(patch.dkimSelectors)) {
    next.dkimSelectors = patch.dkimSelectors.filter(Boolean);
  }

  const saved = await saveLeadSettings(next);
  return NextResponse.json(redact(saved));
}

// "Test key" button — checks a key against Companies House before saving.
export async function POST(request) {
  const body = await request.json();
  const key = (body.companiesHouseKey || "").trim();
  if (!key) return NextResponse.json({ ok: false, error: "Paste a key first." });
  const result = await testApiKey(key);
  return NextResponse.json(result);
}
