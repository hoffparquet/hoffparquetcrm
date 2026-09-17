import { NextResponse } from "next/server";
import { getLeadSettings } from "@/lib/companiesHouse";

// Checks the three DNS records that decide whether your cold outreach
// lands in an inbox or a junk folder: SPF, DKIM and DMARC.
//
// Uses Google's public DNS-over-HTTPS resolver, because Vercel's
// serverless functions can't open raw DNS sockets. No key needed, no
// account, nothing to set up.

const DOH = "https://dns.google/resolve";

async function lookup(name, type) {
  const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { Accept: "application/dns-json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = await res.json();
  // Status 3 is NXDOMAIN — the record simply isn't there.
  if (!body.Answer) return [];
  return body.Answer.map((a) => String(a.data || "").replace(/^"|"$/g, "").replace(/" "/g, ""));
}

function check(pass, detail, fix) {
  return { pass, detail, fix: pass ? "" : fix };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const settings = await getLeadSettings();

  const domain = (body.domain || settings.sendingDomain || "").trim().toLowerCase();
  if (!domain) {
    return NextResponse.json(
      { error: "No sending domain saved yet. Add it above and save, then run the check." },
      { status: 400 }
    );
  }

  const selectors = settings.dkimSelectors?.length ? settings.dkimSelectors : ["selector1", "selector2"];

  const [txt, dmarcTxt, mx] = await Promise.all([
    lookup(domain, "TXT"),
    lookup(`_dmarc.${domain}`, "TXT"),
    lookup(domain, "MX"),
  ]);

  // ---- SPF ----
  const spfRecords = txt.filter((r) => r.toLowerCase().startsWith("v=spf1"));
  const spf = spfRecords[0] || "";
  let spfResult;
  if (spfRecords.length === 0) {
    spfResult = check(false, "No SPF record found.", `Add a TXT record at @ with the value: v=spf1 include:spf.protection.outlook.com -all`);
  } else if (spfRecords.length > 1) {
    spfResult = check(false, `${spfRecords.length} SPF records found — there must be exactly one.`, "Delete the extra TXT records starting v=spf1 until only one remains. Two SPF records make SPF fail entirely.");
  } else if (!spf.includes("spf.protection.outlook.com")) {
    spfResult = check(false, "SPF exists but doesn't authorise Microsoft 365.", `Change the record to: v=spf1 include:spf.protection.outlook.com -all`);
  } else if (!/[-~]all\s*$/.test(spf)) {
    spfResult = check(false, "SPF doesn't end with -all, so it doesn't actually stop anyone else sending as you.", "End the record with -all (a hard fail) rather than leaving it open.");
  } else {
    spfResult = check(true, spf, "");
  }

  // ---- DKIM ----
  const dkimChecks = await Promise.all(
    selectors.map(async (sel) => {
      const host = `${sel}._domainkey.${domain}`;
      const cname = await lookup(host, "CNAME");
      const dkimTxt = cname.length ? [] : await lookup(host, "TXT");
      const found = cname[0] || dkimTxt[0] || "";
      // The classic mistake: the registrar appends the domain to a name
      // that already contained it, giving selector1._domainkey.domain.domain
      const doubled = found.includes(`${domain}.${domain}`) || host.includes(`${domain}.${domain}`);
      return {
        selector: sel,
        pass: !!found && !doubled,
        detail: doubled
          ? "The record name has the domain in it twice."
          : found || "Not found.",
        fix: doubled
          ? `At your registrar, the name field should be just "${sel}._domainkey" — not "${sel}._domainkey.${domain}". Most registrars add the domain for you.`
          : `In Microsoft 365, go to security.microsoft.com → Policies & rules → Threat policies → Email authentication settings → DKIM, select ${domain}, and copy the two CNAME records it shows you. Add them at your registrar, then switch DKIM on.`,
      };
    })
  );
  const dkimResult = {
    pass: dkimChecks.every((d) => d.pass),
    selectors: dkimChecks,
  };

  // ---- DMARC ----
  const dmarc = dmarcTxt.find((r) => r.toLowerCase().startsWith("v=dmarc1")) || "";
  let dmarcResult;
  if (!dmarc) {
    dmarcResult = check(false, "No DMARC record found.", `Add a TXT record at _dmarc with: v=DMARC1; p=none; pct=100; rua=mailto:tomas@${domain}`);
  } else if (!/rua=/.test(dmarc)) {
    dmarcResult = check(false, "DMARC exists but has no reporting address, so you'll never see what's failing.", `Add rua=mailto:tomas@${domain} to the record.`);
  } else {
    dmarcResult = check(true, dmarc, "");
  }

  // ---- MX (informational) ----
  const mxResult = {
    pass: mx.length > 0,
    detail: mx.length ? mx.join(" · ") : "No MX record — this domain can't receive replies yet.",
    fix: mx.length ? "" : "Add the MX record Microsoft 365 gives you when you add the domain, otherwise replies to your outreach bounce.",
  };

  const allPass = spfResult.pass && dkimResult.pass && dmarcResult.pass && mxResult.pass;

  return NextResponse.json({
    domain,
    checkedAt: new Date().toISOString(),
    allPass,
    spf: spfResult,
    dkim: dkimResult,
    dmarc: dmarcResult,
    mx: mxResult,
  });
}
