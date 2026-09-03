// Chrome (and most browsers) use the page's document.title, at the moment
// window.print() is called, as the suggested filename when someone chooses
// "Save as PDF" from the print dialog. Since this app's tab title is always
// "Hoff Parquet CRM", every downloaded quote/invoice/order sheet was landing
// in Downloads as "Hoff Parquet CRM.pdf" regardless of which one it was.
//
// This temporarily renames the tab to something specific (e.g. "Quotation
// HP-Q-0002") right before printing, then restores the normal title once
// the print dialog closes.
export function printWithTitle(title) {
  const previousTitle = document.title;
  document.title = title;

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  };

  window.addEventListener("afterprint", restore);
  window.print();

  // Safety net in case a browser doesn't fire "afterprint" (some older
  // browsers, or if the user cancels in an unusual way). Generous delay so
  // it doesn't revert the title while the save dialog is still open.
  setTimeout(restore, 30000);
}
