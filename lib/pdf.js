// Generates a real PDF file directly from a rendered DOM element and
// triggers a download — no browser print dialog involved at all, so none
// of Chrome's own header/footer (URL, date, page number) ever appears,
// and the filename is exactly what we choose, every time.
//
// This deliberately produces a SINGLE PDF page, sized to exactly fit the
// whole document, rather than slicing the content across multiple
// fixed-height A4 pages. An earlier version tried the multi-page slice
// approach, but cutting a rasterized image at a fixed pixel offset has no
// awareness of where lines of text actually are — the cut can land in the
// middle of a line, producing exactly the kind of messy, seamed-looking
// output this was replaced because of. A single page sized to the content
// has no cut points at all, so there's nothing for text to be sliced
// through. The trade-off is that a very long quote produces one tall page
// rather than several A4-sized ones — for a PDF that's opened and read on
// screen rather than physically printed, that's a reasonable trade.
//
// These two libraries only run in the browser (they need the DOM/canvas),
// so this must only ever be called from a "use client" component, in
// response to a user action like a button click.
export async function downloadElementAsPdf(element, filename) {
  if (!element) {
    window.alert("Nothing to export yet — open the document first.");
    return;
  }

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Wait for web fonts (Fraunces / Public Sans) to finish loading so the
  // captured image doesn't use a fallback font if this runs very soon
  // after the page loads.
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // non-fatal — proceed with whatever fonts are available
    }
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 width in mm, with the page height set to whatever the content
  // actually needs at that width — one page, no breaks.
  const pageWidth = 210;
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  const pdf = new jsPDF({
    unit: "mm",
    format: [pageWidth, pageHeight],
    orientation: "portrait",
  });

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(`${filename}.pdf`);
}
