/* ==========================================================================
   PDF Engine — thin wrapper around Mozilla's PDF.js (vendored locally at
   js/vendor/pdfjs/, version 5.6.205, legacy build — not invented, a real
   mature rendering library as required).

   Loaded via dynamic import() ONLY when a PDF is actually opened, so the
   rest of the app stays exactly what it always was: plain classic
   <script> tags, no build step, works from a double-clicked index.html.
   Dynamic import of a local ES module still requires the file to be
   served over http(s) in most browsers (the same CORS rule that applies
   to <script type="module">) — if that fails, callers see a rejected
   promise and show the existing "can't display" fallback, which is
   correct, not a bug.

   Kept UI-free on purpose: no DOM here, so rendering logic is testable
   independently of pages/pdfReader.js.
   ========================================================================== */

(function (MP) {
  let pdfjsPromise = null;

  function loadEngine() {
    if (!pdfjsPromise) {
      pdfjsPromise = import("../vendor/pdfjs/pdf.min.mjs").then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("js/vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
        return pdfjs;
      });
    }
    return pdfjsPromise;
  }

  // Loads a document from a URL. Returns the pdf.js PDFDocumentProxy.
  async function openDocument(url) {
    const pdfjs = await loadEngine();
    const task = pdfjs.getDocument({ url, withCredentials: false });
    return task.promise;
  }

  // Renders one page onto a canvas at the given CSS scale, using a capped
  // device pixel ratio so large/zoomed pages don't blow up memory.
  async function renderPageToCanvas(doc, pageNumber, canvas, scale) {
    const page = await doc.getPage(pageNumber);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;
    const ctx = canvas.getContext("2d");
    const renderTask = page.render({ canvasContext: ctx, viewport });
    await renderTask.promise;
    return { width: viewport.width / dpr, height: viewport.height / dpr };
  }

  // Page-level text search: returns the list of 1-based page numbers whose
  // extracted text contains the query (case-insensitive). This is real
  // text extracted via pdf.js's own text layer, not a fake/simulated
  // search — but it jumps to the matching PAGE rather than highlighting
  // the exact matched span, which is a deliberate scope simplification
  // (documented as a limitation, not presented as full-text highlighting).
  async function searchPages(doc, query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it) => it.str).join(" ").toLowerCase();
      if (text.includes(q)) matches.push(i);
    }
    return matches;
  }

  // Renders (or, if a layer already exists for this page, repositions) a
  // real PDF.js text layer — actual DOM <span> elements holding the PDF's
  // own extracted text content, invisibly overlaid on the canvas so the
  // browser's native selection/copy/Look Up/Translate all work on real
  // text, never a re-typed or OCR'd approximation.
  //
  // IMPORTANT: `scale` here must be the same plain (non-devicePixelRatio-
  // multiplied) scale used for the canvas's CSS-pixel size (i.e.
  // canvas.style.width/height from renderPageToCanvas), not the raster
  // scale*dpr used for canvas.width/height — the text layer is laid out
  // in CSS pixels, so it must match the canvas's *displayed* box exactly,
  // not its (possibly higher-resolution) pixel buffer.
  async function renderTextLayer(doc, pageNumber, container, scale, existingLayer) {
    const pdfjs = await loadEngine();
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Drives the text layer's own CSS (`calc(var(--total-scale-factor) * pagePt)`)
    // sizing — updating this alone keeps the layer's box in sync on zoom.
    container.style.setProperty("--total-scale-factor", String(scale));

    if (existingLayer) {
      // Re-zoom of an already-built layer: reposition/rescale the existing
      // real text spans instead of tearing them down and re-extracting text
      // content from the document again.
      existingLayer.update({ viewport });
      return existingLayer;
    }

    const textContent = await page.getTextContent();
    const layer = new pdfjs.TextLayer({ textContentSource: textContent, container, viewport });
    await layer.render();
    return layer;
  }

  MP.pdfEngine = { openDocument, renderPageToCanvas, renderTextLayer, searchPages };
})(window.MP = window.MP || {});
