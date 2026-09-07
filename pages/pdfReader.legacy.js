/* ==========================================================================
   Page: PDF Reader (/pdf/:lessonId/:index)
   ========================================================================== */

(function (MP) {
  const { topbarHtml, searchBarHtml, loadingHtml, errorHtml, bottomBarHtml } = MP.components.pdfReaderUI;
  const { isSafeUrl } = MP.components.linkViewer; // reuse the same http(s)-only scheme guard
  const { findLesson } = MP.data;
  const { on, qs } = MP.dom;

  function resolvePdf(params) {
    const found = findLesson(params.lessonId);
    if (!found) return null;
    if (params.fileId) {
      // Local file (IndexedDB, via MP.files) — no metadata is available
      // synchronously, so the entry is a stub; afterRender fetches the
      // real record (name + blob) and fills in the title/URL once loaded.
      return { lesson: found.lesson, entry: { title: "PDF", isLocal: true, fileId: params.fileId } };
    }
    const pdfs = (found.lesson.resources && found.lesson.resources.pdfs) || [];
    const entry = pdfs[Number(params.index)];
    if (!entry) return null;
    return { lesson: found.lesson, entry };
  }

  function render(params = {}) {
    const resolved = resolvePdf(params);
    const title = resolved ? resolved.entry.title || "PDF" : "PDF";
    return `
      <div class="page" data-page="pdf-reader">
        ${topbarHtml(title)}
        <div data-pdf-body>${loadingHtml()}</div>
      </div>`;
  }

  function afterRender(root, params = {}) {
    on(root, "click", '[data-action="go-back"]', () => MP.router.back());

    const resolved = resolvePdf(params);
    const body = qs("[data-pdf-body]", root);
    const isLocal = !!(resolved && resolved.entry.isLocal);
    const url = resolved && !isLocal && resolved.entry.url ? resolved.entry.url.trim() : null;
    let localBlobUrl = null; // set once the IndexedDB blob is loaded, for local files only

    on(root, "click", '[data-action="viewer-open-external"]', () => {
      if (isLocal) {
        if (localBlobUrl) window.open(localBlobUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (url && isSafeUrl(url)) window.open(url, "_blank", "noopener,noreferrer");
    });

    if (!resolved) {
      body.innerHTML = errorHtml("This resource couldn't be found.");
      return;
    }
    if (!isLocal && (!url || !isSafeUrl(url))) {
      body.innerHTML = errorHtml("No web address is attached to this PDF yet.");
      return;
    }

    const isAlive = () => document.body.contains(root);
    let doc = null;
    let scale = 1;
    const MIN_SCALE = 0.6;
    const MAX_SCALE = 3;
    let currentPage = 1;
    let searchMatches = [];
    let searchIndex = -1;
    const textLayers = new Map(); // pageNumber -> { layer, container } — real PDF.js text layers, kept across zoom

    function proceedWithUrl(pdfUrl) {
      MP.pdfEngine
        .openDocument(pdfUrl)
        .then(async (loadedDoc) => {
          if (!isAlive()) return;
          doc = loadedDoc;
          await buildPageSlots();
          if (!isAlive()) return;
          wireControls();
          renderVisiblePages();
        })
        .catch(() => {
          if (!isAlive()) return;
          body.innerHTML = errorHtml("The document couldn't be loaded. It may be missing or blocked.");
        });
    }

    async function loadLocalFileThenOpen() {
      if (!MP.files) {
        body.innerHTML = errorHtml("Local file storage isn't available in this browser.");
        return;
      }
      try {
        const record = await MP.files.get(resolved.entry.fileId);
        if (!isAlive()) return;
        if (!record || record.lessonId !== resolved.lesson.id || !record.blob) {
          body.innerHTML = errorHtml("This file couldn't be found. It may have been removed.");
          return;
        }
        const titleEl = qs(".viewer-title", root);
        if (titleEl) titleEl.textContent = record.name || "PDF";
        localBlobUrl = URL.createObjectURL(record.blob);
        proceedWithUrl(localBlobUrl);
      } catch (e) {
        if (!isAlive()) return;
        body.innerHTML = errorHtml("The document couldn't be loaded. It may be missing or blocked.");
      }
    }

    if (isLocal) {
      loadLocalFileThenOpen();
    } else {
      proceedWithUrl(url);
    }

    async function buildPageSlots() {
      const containerWidth = body.clientWidth || 360;
      let html = `${searchBarHtml()}<div class="pdf-scroll" data-pdf-scroll><div class="pdf-scroll-inner" data-pdf-scroll-inner>`;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        scale = Math.min(scale, (containerWidth - 24) / vp1.width) || scale;
        html += `<div class="pdf-page-slot" data-pdf-page-slot data-page-number="${i}" data-w1="${vp1.width}" data-h1="${vp1.height}"
          style="height:${(vp1.height / vp1.width) * (containerWidth - 24)}px">
          <canvas class="pdf-page-canvas" data-pdf-canvas></canvas>
          <div class="textLayer" data-pdf-text-layer></div>
        </div>`;
      }
      html += `</div></div>${bottomBarHtml()}`;
      body.innerHTML = html;
      updatePageIndicator();
    }

    function wireControls() {
      const scroll = qs("[data-pdf-scroll]", body);
      const inner = qs("[data-pdf-scroll-inner]", body);
      const slots = Array.from(scroll.querySelectorAll("[data-pdf-page-slot]"));

      // Lazy-render prefetch ONLY — deliberately not reused for page
      // tracking (see updateCurrentPageFromScroll) or for zoom (which is
      // handled entirely separately below, via a live CSS-transform
      // preview + a single committed re-layout, never via this observer).
      let observerPaused = false;
      const observer = new IntersectionObserver(
        (entries) => {
          if (observerPaused) return;
          entries.forEach((entry) => {
            if (entry.isIntersecting) renderSlot(entry.target);
          });
        },
        { root: scroll, rootMargin: "600px 0px", threshold: 0.01 }
      );
      slots.forEach((s) => observer.observe(s));

      // Page-number tracking is deliberately a separate, tight calculation
      // (not derived from the wide-margin render-prefetch observer above,
      // which otherwise made the indicator lag ~1 page behind after
      // programmatic jumps/search). It reads real scrollTop, so it's
      // naturally inert during a pinch — the live preview below never
      // touches scrollTop, only a CSS transform, so there's nothing for
      // this listener to react to until the gesture actually commits.
      scroll.addEventListener("scroll", throttle(updateCurrentPageFromScroll, 100), { passive: true });
      updateCurrentPageFromScroll();

      on(root, "click", '[data-action="pdf-zoom-in"]', () => commitZoom(scale * 1.25, viewportCenterAnchor()));
      on(root, "click", '[data-action="pdf-zoom-out"]', () => commitZoom(scale / 1.25, viewportCenterAnchor()));

      wirePinchZoom(scroll, inner, observer, (paused) => {
        observerPaused = paused;
      });

      on(root, "click", '[data-action="pdf-jump"]', () => openJumpSheet());
      on(root, "click", '[data-action="pdf-toggle-search"]', () => toggleSearch());
      on(root, "click", '[data-action="pdf-search-next"]', () => stepSearch(1));
      on(root, "click", '[data-action="pdf-search-prev"]', () => stepSearch(-1));
      on(root, "input", "[data-pdf-search-input]", debounce(runSearch, 300));
    }

    // Returns the current scroll-space anchor point at the vertical/
    // horizontal center of the viewport — used so zoom-button taps (which
    // have no gesture midpoint of their own) still keep the current
    // reading position visually stable, same as a pinch does.
    function viewportCenterAnchor() {
      const scroll = qs("[data-pdf-scroll]", body);
      const r = scroll.getBoundingClientRect();
      return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    }

    // ---- Pinch-to-zoom ----------------------------------------------------
    // Two phases, deliberately kept separate:
    //  1. LIVE PREVIEW (every touchmove): a pure CSS `transform: scale()` on
    //     an inner wrapper, anchored (via transform-origin) at the pinch
    //     midpoint's position in un-scrolled content space. Zero layout,
    //     zero canvas/text-layer re-render, zero scrollTop change — so
    //     there is nothing for page-tracking or lazy-render to react to,
    //     and nothing that can make the reader jump between pages.
    //  2. COMMIT (once, on touchend): compute the final scale, reset the
    //     preview transform, do ONE real re-layout (page-slot heights) at
    //     that scale, then restore scrollTop so the anchored content point
    //     lands back under the same screen position, and re-render visible
    //     pages. This mirrors the requested "stable dimensions → preserve
    //     anchor → update zoom → re-render → restore anchor" strategy.
    function wirePinchZoom(scroll, inner, observer, setObserverPaused) {
      let pinchStartDist = null;
      let pinchStartScale = scale;
      let anchor = null; // { contentX, contentY, clientX, clientY } in un-scrolled content space
      let liveRatio = 1;

      function contentPointFor(clientX, clientY) {
        const r = scroll.getBoundingClientRect();
        return {
          contentX: clientX - r.left + scroll.scrollLeft,
          contentY: clientY - r.top + scroll.scrollTop,
          clientX,
          clientY,
        };
      }

      scroll.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length === 2) {
            pinchStartDist = touchDist(e.touches);
            pinchStartScale = scale;
            liveRatio = 1;
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            anchor = contentPointFor(midX, midY);
            setObserverPaused(true);
          }
        },
        { passive: true }
      );

      scroll.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches.length === 2 && pinchStartDist && anchor) {
            // Non-passive on purpose: this is the one call that must
            // suppress the browser's own native pinch-zoom/scroll
            // handling for this gesture, so our transform is the only
            // thing moving. Single-finger touches never reach this
            // branch, so normal scrolling is completely unaffected.
            e.preventDefault();
            const rawRatio = touchDist(e.touches) / pinchStartDist;
            const targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScale * rawRatio));
            liveRatio = targetScale / pinchStartScale;
            inner.style.transformOrigin = `${anchor.contentX}px ${anchor.contentY}px`;
            inner.style.transform = `scale(${liveRatio})`;
          }
        },
        { passive: false }
      );

      function endPinch() {
        if (!anchor) return;
        const finalScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScale * liveRatio));
        inner.style.transform = "";
        inner.style.transformOrigin = "";
        pinchStartDist = null;
        const finishedAnchor = anchor;
        const startScale = pinchStartScale;
        anchor = null;
        setObserverPaused(false);
        commitZoom(finalScale, finishedAnchor, startScale);
      }

      scroll.addEventListener("touchend", (e) => {
        if (e.touches.length < 2) endPinch();
      });
      scroll.addEventListener("touchcancel", () => {
        if (anchor) {
          inner.style.transform = "";
          inner.style.transformOrigin = "";
          pinchStartDist = null;
          anchor = null;
          setObserverPaused(false);
        }
      });
    }

    // Applies a new scale exactly once (real layout + re-render), then
    // restores scroll position so whatever content point was under
    // `anchorPoint` stays under it on screen — this is what keeps "page 5
    // under your fingers" from jumping to page 4 or 6. `fromScale`
    // defaults to the scale in effect right before this call (the normal
    // case for zoom buttons); pinch passes the scale captured at
    // touchstart explicitly, since `scale` may already have moved.
    function commitZoom(next, anchorPoint, fromScale) {
      const startScale = fromScale || scale;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      const scroll = qs("[data-pdf-scroll]", body);
      if (!scroll) return;
      const ratio = nextScale / startScale;

      let anchor = anchorPoint;
      if (!anchor) anchor = viewportCenterAnchor();
      const r = scroll.getBoundingClientRect();
      const contentX = "contentX" in anchor ? anchor.contentX : anchor.clientX - r.left + scroll.scrollLeft;
      const contentY = "contentY" in anchor ? anchor.contentY : anchor.clientY - r.top + scroll.scrollTop;
      const viewportOffsetX = anchor.clientX - r.left;
      const viewportOffsetY = anchor.clientY - r.top;

      scale = nextScale;
      Array.from(scroll.querySelectorAll("[data-pdf-page-slot]")).forEach((s) => {
        const h1 = Number(s.dataset.h1);
        const w1 = Number(s.dataset.w1);
        s.style.height = `${(h1 / w1) * (w1 * scale)}px`;
        if (s.dataset.rendered === "1") {
          s.dataset.rendered = "0";
          renderSlot(s);
        }
      });

      // The whole document scales uniformly (every slot's height is
      // proportional to `scale`), so the anchored content point simply
      // moves to contentX/Y * ratio in the new layout — place it back at
      // the same viewport offset it was at before.
      scroll.scrollLeft = Math.max(0, contentX * ratio - viewportOffsetX);
      scroll.scrollTop = Math.max(0, contentY * ratio - viewportOffsetY);

      renderVisiblePages();
      updateCurrentPageFromScroll();
    }

    function touchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function debounce(fn, ms) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    }

    function throttle(fn, ms) {
      let last = 0;
      let pending = null;
      return (...args) => {
        const now = Date.now();
        if (now - last >= ms) {
          last = now;
          fn(...args);
        } else {
          clearTimeout(pending);
          pending = setTimeout(() => {
            last = Date.now();
            fn(...args);
          }, ms - (now - last));
        }
      };
    }

    function updateCurrentPageFromScroll() {
      const scroll = qs("[data-pdf-scroll]", body);
      if (!scroll) return;
      const containerTop = scroll.getBoundingClientRect().top;
      const probeY = containerTop + 12; // just under the top edge of the scroll area
      let best = null;
      Array.from(scroll.querySelectorAll("[data-pdf-page-slot]")).forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) best = s;
      });
      if (!best) {
        // fallback: closest slot whose top is nearest to (and above) the probe line
        const slots = Array.from(scroll.querySelectorAll("[data-pdf-page-slot]"));
        best = slots.reduce((acc, s) => {
          const r = s.getBoundingClientRect();
          if (r.top <= probeY && (!acc || r.top > acc.getBoundingClientRect().top)) return s;
          return acc;
        }, null) || slots[0];
      }
      if (best) {
        currentPage = Number(best.dataset.pageNumber);
        updatePageIndicator();
      }
    }

    function renderSlot(slotEl) {
      if (slotEl.dataset.rendered === "1" || slotEl.dataset.rendered === "pending" || !isAlive()) return;
      slotEl.dataset.rendered = "pending";
      const pageNumber = Number(slotEl.dataset.pageNumber);
      const canvas = qs("[data-pdf-canvas]", slotEl);
      const renderScale = scale; // the scale AT THE MOMENT this render started
      MP.pdfEngine
        .renderPageToCanvas(doc, pageNumber, canvas, renderScale)
        .then(() => {
          if (!isAlive()) return;
          slotEl.dataset.rendered = "1";
          slotEl.style.height = "";
          renderTextLayerForSlot(slotEl, pageNumber);
          if (scale !== renderScale) {
            // Zoom moved again while this render was still in flight (e.g.
            // rapid taps on the zoom button) — the guard above would have
            // silently dropped that request, leaving the canvas stuck at a
            // stale scale while the (cheaper) text layer catches up to the
            // latest one. Re-render immediately so they stay in sync.
            slotEl.dataset.rendered = "0";
            renderSlot(slotEl);
          }
        })
        .catch(() => {
          slotEl.dataset.rendered = "0";
        });
    }

    // Builds the real (selectable/copyable) PDF.js text layer for a page the
    // first time it's rendered, or repositions the existing one on re-zoom —
    // never re-fakes text, and failure here is non-fatal (the page still
    // renders visually via the canvas either way).
    function renderTextLayerForSlot(slotEl, pageNumber) {
      const container = qs("[data-pdf-text-layer]", slotEl);
      if (!container) return;
      const existing = textLayers.get(pageNumber);
      MP.pdfEngine
        .renderTextLayer(doc, pageNumber, container, scale, existing && existing.layer)
        .then((layer) => {
          if (!isAlive()) return;
          textLayers.set(pageNumber, { layer, container });
        })
        .catch(() => {
          // Text layer is an enhancement over the canvas render, not a
          // requirement — a scanned/image-only PDF simply has no text
          // content and this quietly leaves the layer empty.
        });
    }

    function renderVisiblePages() {
      const scroll = qs("[data-pdf-scroll]", body);
      if (!scroll) return;
      Array.from(scroll.querySelectorAll("[data-pdf-page-slot]")).forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.bottom > -600 && r.top < window.innerHeight + 600) renderSlot(s);
      });
    }

    function updatePageIndicator() {
      const el = qs("[data-pdf-page-indicator]", body);
      if (el && doc) el.textContent = `Page ${currentPage} / ${doc.numPages}`;
    }

    function openJumpSheet() {
      if (!MP.sheet) return;
      MP.sheet.open(
        `<h2 class="sheet-title">Jump to Page</h2>
         <div class="sheet-field">
           <label class="sheet-label">Page (1–${doc.numPages})</label>
           <input class="sheet-input" type="number" min="1" max="${doc.numPages}" value="${currentPage}" data-field="page" />
         </div>
         <div class="sheet-actions">
           <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
           <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Go</button>
         </div>`,
        {
          submit: (c) => {
            const n = Math.max(1, Math.min(doc.numPages, Number(qs('[data-field="page"]', c).value) || 1));
            MP.sheet.close();
            scrollToPage(n);
          },
        }
      );
    }

    function scrollToPage(n) {
      const scroll = qs("[data-pdf-scroll]", body);
      const slot = scroll && scroll.querySelector(`[data-page-number="${n}"]`);
      if (slot) {
        slot.scrollIntoView({ block: "start" });
        currentPage = n;
        updatePageIndicator();
      }
    }

    function toggleSearch() {
      const bar = qs("[data-pdf-search-bar]", body);
      if (!bar) return;
      bar.classList.toggle("is-open");
      if (bar.classList.contains("is-open")) qs("[data-pdf-search-input]", bar).focus();
    }

    async function runSearch(e, target) {
      const input = target || qs("[data-pdf-search-input]", body);
      const query = input ? input.value : "";
      const countEl = qs("[data-pdf-search-count]", body);
      if (!query.trim()) {
        searchMatches = [];
        searchIndex = -1;
        if (countEl) countEl.textContent = "";
        return;
      }
      searchMatches = await MP.pdfEngine.searchPages(doc, query);
      searchIndex = searchMatches.length ? 0 : -1;
      if (countEl) countEl.textContent = searchMatches.length ? `${searchIndex + 1}/${searchMatches.length}` : "No matches";
      if (searchIndex >= 0) scrollToPage(searchMatches[searchIndex]);
    }

    function stepSearch(dir) {
      if (!searchMatches.length) return;
      searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length;
      const countEl = qs("[data-pdf-search-count]", body);
      if (countEl) countEl.textContent = `${searchIndex + 1}/${searchMatches.length}`;
      scrollToPage(searchMatches[searchIndex]);
    }
  }

  MP.pages = MP.pages || {};
  MP.pages.pdfReader = { render, afterRender };
})(window.MP = window.MP || {});
