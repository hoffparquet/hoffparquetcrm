import { graphRequest } from "@/lib/graphMail";
import { buildOutreachEmail, extractOpening, LOGO_CID, FLYER_NAME } from "@/lib/outreachEmail";
import { FLYER_BASE64 } from "@/lib/assets/flyer";
import { LOGO_BASE64 } from "@/lib/assets/logo";

// "Finishes" the agent's outreach drafts in sales@ Drafts:
//   1. rebuilds the email in the branded layout (lib/outreachEmail.js),
//      keeping the agent's personalised greeting and opening line;
//   2. adds the logo for the signature (as an embedded image);
//   3. attaches the PDF flyer;
//   4. tags the draft "Ready to send".
//
// Only drafts tagged "Outreach" and NOT yet tagged "Ready to send" are
// touched. Nothing is ever sent or deleted — you still press Send yourself.

export const READY_CATEGORY = "Ready to send";
const MAX_PER_RUN = 25;
const LOGO_FILE = "hoff-parquet-logo.png";

export async function finishOutreachDrafts() {
  const result = { finished: 0, skipped: 0, errors: [] };

  const filter = encodeURIComponent("categories/any(c:c eq 'Outreach')");
  const list = await graphRequest(
    `/mailFolders/Drafts/messages?$filter=${filter}&$select=id,subject,categories,body,hasAttachments&$top=50`
  );
  const drafts = (list?.value || []).filter(
    (d) => !(d.categories || []).some((c) => c.toLowerCase() === READY_CATEGORY.toLowerCase())
  );

  for (const d of drafts.slice(0, MAX_PER_RUN)) {
    const label = d.subject || d.id;
    try {
      const parts = extractOpening(d.body?.content);
      if (!parts) {
        // Not in the agent's usual shape — leave it exactly as it is.
        result.skipped += 1;
        result.errors.push(`Left unchanged (couldn't find greeting/opening): ${label}`);
        continue;
      }

      // 1. Branded body.
      await graphRequest(`/messages/${d.id}`, {
        method: "PATCH",
        body: { body: { contentType: "HTML", content: buildOutreachEmail(parts) } },
      });

      // 2–3. Logo + flyer. Skip if an earlier, interrupted run already added them.
      // (Only "name" is requested: Microsoft rejects asking for contentId here.)
      const existing = await graphRequest(`/messages/${d.id}/attachments?$select=name`);
      const names = (existing?.value || []).map((a) => a.name);

      if (!names.includes(LOGO_FILE)) {
        await graphRequest(`/messages/${d.id}/attachments`, {
          method: "POST",
          body: {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: LOGO_FILE,
            contentType: "image/png",
            contentBytes: LOGO_BASE64,
            isInline: true,
            contentId: LOGO_CID,
          },
        });
      }
      if (!names.includes(FLYER_NAME)) {
        await graphRequest(`/messages/${d.id}/attachments`, {
          method: "POST",
          body: {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: FLYER_NAME,
            contentType: "application/pdf",
            contentBytes: FLYER_BASE64,
          },
        });
      }

      // 4. Tag it, keeping every existing tag (the CRM relies on Town/Group/Company).
      await graphRequest(`/messages/${d.id}`, {
        method: "PATCH",
        body: { categories: [...(d.categories || []), READY_CATEGORY] },
      });

      result.finished += 1;
    } catch (e) {
      result.errors.push(`${label}: ${e.message}`);
    }
  }
  return result;
}
