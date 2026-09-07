/* ==========================================================================
   PDF Viewer Engine — thin wrapper around Mozilla's OFFICIAL PDF.js viewer
   components (web/pdf_viewer.mjs, vendored locally at js/vendor/pdfjs/,
   version 5.6.205 — the exact same build as the already-vendored core
   js/vendor/pdfjs/pdf.min.mjs).

   This replaces the previous hand-rolled canvas + custom text-layer +
   custom pinch-zoom implementation. Rendering, page layout, the render
   queue/lazy-rendering, zoom (including scroll-anchor preservation), the
   text layer, and search are now ALL owned by PDF.js itself — this file
   only wires its components together and exposes a small surface for
   pages/pdfReader.js to drive from MedPocket's own UI shell.

   Deliberately NOT included: annotation editing/forms UI, the built-in
   toolbar/sidebar — MedPocket supplies its own chrome around this engine.

   Loaded via dynamic import() ONLY when a PDF is actually opened, exactly
   like the previous engine, so the rest of the app stays plain <script>
   tags with no build step.
   ========================================================================== */

(function (MP) {
  let loadPromise = null;

  // pdf_viewer.mjs is a self-contained webpack bundle that reads the WHOLE
  // core API off `globalThis.pdfjsLib` the moment it's evaluated (see its
  // own `} = globalThis.pdfjsLib;` at the top) — pdf.min.mjs sets that
  // global itself as a side effect of being imported, so it's enough to
  // import core first and viewer second, sequentially.
  function loadLibs() {
    if (!loadPromise) {
      loadPromise = import("../vendor/pdfjs/pdf.min.mjs").then((pdfjsLib) => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("js/vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;
        return import("../vendor/pdfjs/pdf_viewer.mjs").then((pdfjsViewer) => ({ pdfjsLib, pdfjsViewer }));
      });
    }
    return loadPromise;
  }

  // Creates one fully-wired official viewer instance mounted into
  // `containerEl` (the scrollable outer div — must be position:absolute
  // per PDFViewer's own contract) with `viewerEl` as its required direct
  // child (becomes the `.pdfViewer` PDF.js populates with page divs).
  async function createViewer(containerEl, viewerEl, callbacks = {}) {
    const { pdfjsLib, pdfjsViewer } = await loadLibs();

    const eventBus = new pdfjsViewer.EventBus();
    const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
    const findController = new pdfjsViewer.PDFFindController({ eventBus, linkService });

    const pdfViewer = new pdfjsViewer.PDFViewer({
      container: containerEl,
      viewer: viewerEl,
      eventBus,
      linkService,
      findController,
      // No annotation editing/forms UI — MedPocket doesn't need PDF form
      // filling, and this keeps the engine to the rendering/text/zoom/
      // scroll responsibilities the task asks official PDF.js to own.
      annotationMode: pdfjsLib.AnnotationMode.DISABLE,
      annotationEditorMode: pdfjsLib.AnnotationEditorType?.DISABLE ?? -1,
      // textLayerMode defaults to ENABLE already; set explicitly so the
      // intent (real selectable text, not DISABLE) is never silently lost
      // if pdf.js's default ever changes.
      textLayerMode: pdfjsViewer.TextLayerMode?.ENABLE ?? 1,
    });
    linkService.setViewer(pdfViewer);

    if (callbacks.onPagesInit) eventBus.on("pagesinit", callbacks.onPagesInit);
    if (callbacks.onPagesLoaded) eventBus.on("pagesloaded", callbacks.onPagesLoaded);
    if (callbacks.onPageChanging) eventBus.on("pagechanging", callbacks.onPageChanging);
    if (callbacks.onScaleChanging) eventBus.on("scalechanging", callbacks.onScaleChanging);
    if (callbacks.onUpdateFindMatchesCount) eventBus.on("updatefindmatchescount", callbacks.onUpdateFindMatchesCount);
    if (callbacks.onUpdateFindControlState) eventBus.on("updatefindcontrolstate", callbacks.onUpdateFindControlState);
    // Fired every time a page finishes rendering — including re-renders
    // after zoom changes and lazy renders while scrolling. pdfReader.js
    // uses it to repaint saved highlight overlays at the page's current
    // geometry without touching PDF.js's own render pipeline.
    if (callbacks.onPageRendered) eventBus.on("pagerendered", callbacks.onPageRendered);

    return { pdfjsLib, pdfjsViewer, eventBus, linkService, findController, pdfViewer };
  }

  // `src` is either { url } for a remote/blob URL PDF, or { data } for an
  // ArrayBuffer/Uint8Array already in memory (used for local IndexedDB
  // files — see pages/pdfReader.js — so the bytes never touch a server).
  async function openDocument(handle, src) {
    const loadingTask = handle.pdfjsLib.getDocument(src);
    const pdfDocument = await loadingTask.promise;
    handle.pdfViewer.setDocument(pdfDocument);
    handle.linkService.setDocument(pdfDocument);
    handle.findController.setDocument(pdfDocument);
    return pdfDocument;
  }

  // Official find/search — same text extraction the text layer itself
  // uses, per PDFFindController reading from the same PDFDocumentProxy.
  function search(handle, query, opts = {}) {
    handle.eventBus.dispatch("find", {
      source: handle,
      type: opts.type || "",
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: !!opts.previous,
      matchDiacritics: true,
    });
  }

  function closeSearch(handle) {
    handle.eventBus.dispatch("findbarclose", { source: handle });
  }

  // Discrete zoom (buttons): PDFViewer's own currentScale setter already
  // recomputes layout AND preserves scroll position relative to the
  // current view (noScroll:false path) — no custom anchor math needed.
  function zoomBy(handle, factor) {
    const next = Math.max(0.25, Math.min(5, handle.pdfViewer.currentScale * factor));
    handle.pdfViewer.currentScaleValue = String(next);
  }

  function jumpToPage(handle, pageNumber) {
    const n = Math.max(1, Math.min(handle.pdfViewer.pagesCount, Math.floor(pageNumber) || 1));
    handle.pdfViewer.currentPageNumber = n;
  }

  function destroy(handle) {
    if (!handle) return;
    try {
      handle.pdfViewer.setDocument(null);
      handle.linkService.setDocument(null, null);
    } catch (e) {
      /* best-effort teardown */
    }
  }

  MP.pdfViewerEngine = { createViewer, openDocument, search, closeSearch, zoomBy, jumpToPage, destroy };
})(window.MP = window.MP || {});
