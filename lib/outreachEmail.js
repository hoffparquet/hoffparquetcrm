// The branded outreach email.
//
// The daily agent writes a plain draft (greeting + a personalised opening
// line). The CRM then rebuilds it with this layout: brand colours, a short
// "what we offer" list, a trade-price panel, a button to the website, the
// logo signature and the confidentiality notice.
//
// Email clients are fussy, so this uses tables and inline styles only —
// the same technique every newsletter tool uses.

const OAK = "#8B6A43";
const INK = "#2B2622";
const MUTED = "#6B5B45";
const CREAM = "#F7F4EE";
const LINE = "#E6DFD3";
const FONT = "Helvetica, Arial, sans-serif";

export const LOGO_CID = "hoff-parquet-logo";
export const FLYER_NAME = "Hoff Parquet – Flyer.pdf";

const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const p = (html, extra = "") =>
  `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};${extra}">${html}</p>`;

function offerRow(label, text) {
  return `<tr>
    <td valign="top" style="padding:0 10px 8px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${OAK};">&#9670;</td>
    <td valign="top" style="padding:0 0 8px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};"><strong>${label}</strong> &ndash; ${text}</td>
  </tr>`;
}

export function buildOutreachEmail({ greeting, opening }) {
  return `<div style="background:#ffffff;padding:0;margin:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:4px 0 0 0;">

${p(esc(greeting))}
${p(esc(opening))}
${p("We&rsquo;re <strong>Hoff Parquet</strong>, an Edinburgh-based specialist in premium wood flooring. Here&rsquo;s what we can do for your projects:")}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
  ${offerRow("Woods", "engineered oak in 60+ colours, Douglas fir and ash")}
  ${offerRow("Patterns", "herringbone, chevron, Versailles panels, mansion weave and wide plank")}
  ${offerRow("Bespoke", "made to your sizes, colours and finishes, plus stair cladding")}
  ${offerRow("Supply &amp; installation", "across the UK &middot; FSC &amp; PEFC certified, made in the EU")}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;">
  <tr><td style="background:${CREAM};border-left:4px solid ${OAK};padding:14px 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">
    <strong style="color:${OAK};">Trade prices</strong> for designers, architects and developers. We can send samples to match a specific scheme, or put together a quotation from your drawings.
  </td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;">
  <tr><td style="background:${OAK};border-radius:4px;">
    <a href="https://www.hoffparquet.co.uk" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Explore our products &amp; services &rarr;</a>
  </td></tr>
</table>

${p("I&rsquo;ve attached our flyer with a few recent floors. If anything catches your eye, just reply to this email.")}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
  <tr><td style="font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};padding:0 0 10px 0;">Kind regards,</td></tr>
  <tr><td style="padding:0 0 10px 0;"><img src="cid:${LOGO_CID}" width="220" height="19" alt="HOFF PARQUET" style="display:block;border:0;width:220px;height:auto;"></td></tr>
  <tr><td style="font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};border-top:1px solid ${LINE};padding:8px 0 0 0;">
    <a href="tel:+441313857779" style="color:${MUTED};text-decoration:none;">0131 385 7779</a> &nbsp;|&nbsp; <a href="mailto:info@hofftimber.com" style="color:${OAK};text-decoration:none;">info@hofftimber.com</a><br>
    <a href="https://www.hoffparquet.co.uk" style="color:${OAK};text-decoration:none;">www.hoffparquet.co.uk</a> &nbsp;|&nbsp; <a href="https://www.hofftimber.com" style="color:${OAK};text-decoration:none;">www.hofftimber.com</a><br>
    37 Comiston Road, Edinburgh, EH10 6AB
  </td></tr>
</table>

<p style="margin:26px 0 8px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8A7F72;">We promise not to spam; we&rsquo;ll only share information we think you&rsquo;ll find valuable. If you&rsquo;d rather not hear from us, just reply &ldquo;unsubscribe&rdquo; and we won&rsquo;t contact you again.</p>
<p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.5;color:#A39A8E;">This e-mail is for the exclusive use of the intended recipient. The contents of this e-mail and any attachments are confidential and may be privileged or otherwise protected from disclosure. If you are not an intended recipient or you have received this e-mail mistakenly, you are hereby notified that any disclosure, copying or distribution of this information is strictly prohibited. Please inform the sender about this e-mail and delete the document without disclosing its contents.</p>

</td></tr></table></div>`;
}

// Pulls the greeting and personalised opening line out of the agent's
// plain draft: they are always the first two paragraphs.
export function extractOpening(html) {
  const paras = [...String(html || "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) =>
      m[1]
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;|&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  const greeting = paras[0] || "";
  const opening = paras[1] || "";
  if (!/^hi\b/i.test(greeting) || !/came across/i.test(opening)) return null;
  return { greeting, opening };
}
