// Generates a real PDF file directly from a rendered DOM element and
// triggers a download — no browser print dialog involved at all, so none
// of Chrome's own header/footer (URL, date, page number) ever appears,
// and the filename is exactly what we choose, every time.
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

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Draw the full-length image on the first page, then keep adding pages,
  // each time shifting the same image further up so the next unseen
  // portion falls within that page's visible area — the standard way to
  // paginate a single tall canvas capture across multiple PDF pages.
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${filename}.pdf`);
}
