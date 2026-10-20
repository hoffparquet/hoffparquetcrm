// Decides whether an incoming email looks like a genuine enquiry about
// Hoff's flooring products or services, as opposed to automatic replies,
// newsletters, supplier/system notifications and so on.
//
// This is deliberately simple keyword logic, not AI. Anything it doesn't
// pick up is NOT lost: it's still listed under "Other mail" on the Email
// enquiries page, where staff can add it to the CRM with one click.

const OWN_DOMAINS = ["hoffparquet.co.uk", "hofftimber.com"];

const NOISE_DOMAINS = [
  "godaddy.com", "secureserver.net", "microsoft.com", "microsoftonline.com", "office365.com",
  "anthropic.com", "vercel.com", "github.com", "mollie.com", "sumup.com",
  "google.com", "linkedin.com", "facebookmail.com", "metricool.com", "paypal.com", "stripe.com",
];

const NOISE_SENDER = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce|newsletter|notifications?@|marketing@|noreply)/i;

const NOISE_SUBJECT = /^\s*(automatic reply|auto[- ]?reply|autoreply|out of office|undeliverable|delivery (status|has failed)|mail delivery|read:|accepted:|declined:|tentative:|invitation:)/i;

// Words that point to a flooring product or service enquiry.
const ENQUIRY_WORDS = new RegExp(
  "\\b(" +
    [
      "floor", "floors", "flooring", "parquet", "herringbone", "chevron", "plank", "planks",
      "oak", "ash", "douglas fir", "baltic pine", "riga", "engineered", "solid wood", "timber",
      "sanding", "sand and", "refinish", "restoration", "restore", "installation", "install",
      "installed", "installing", "fitting", "fitter", "subfloor", "underlay", "oiled", "oiling",
      "lacquer", "quote", "quotation", "estimate", "price list", "prices", "pricing", "sample",
      "samples", "supply", "supply and fit", "sqm", "m2", "square metres", "square meters",
      "brochure", "trade account", "trade price", "lead time", "delivery",
    ].join("|") +
    ")\\b",
  "i"
);

function headerValue(headers, name) {
  if (!Array.isArray(headers)) return "";
  const h = headers.find((x) => (x.name || "").toLowerCase() === name.toLowerCase());
  return h ? String(h.value || "") : "";
}

export function classifyEmail(msg) {
  const senderEmail = String(msg?.from?.emailAddress?.address || "").toLowerCase();
  const domain = senderEmail.split("@")[1] || "";
  const subject = String(msg?.subject || "");
  const bodyText = String(msg?.body?.content || "").slice(0, 3000);

  if (msg?.isDraft) return { isEnquiry: false, reason: "draft" };
  if (!senderEmail) return { isEnquiry: false, reason: "no sender" };
  if (OWN_DOMAINS.includes(domain)) return { isEnquiry: false, reason: "internal" };
  if (NOISE_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return { isEnquiry: false, reason: "system sender" };
  if (NOISE_SENDER.test(senderEmail)) return { isEnquiry: false, reason: "no-reply sender" };
  if (NOISE_SUBJECT.test(subject)) return { isEnquiry: false, reason: "automatic reply" };

  const headers = msg.internetMessageHeaders;
  const autoSubmitted = headerValue(headers, "Auto-Submitted").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return { isEnquiry: false, reason: "automatic reply" };
  if (headerValue(headers, "List-Unsubscribe")) return { isEnquiry: false, reason: "newsletter" };
  if (/^(bulk|list|junk)$/i.test(headerValue(headers, "Precedence").trim())) return { isEnquiry: false, reason: "bulk mail" };

  if (ENQUIRY_WORDS.test(subject) || ENQUIRY_WORDS.test(bodyText)) return { isEnquiry: true, reason: "flooring keywords" };
  return { isEnquiry: false, reason: "no flooring keywords" };
}

// A short, tidy preview of an email body for the CRM note / inbox list.
export function makeSnippet(msg, maxLen = 600) {
  const text = String(msg?.body?.content || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, maxLen);
}
