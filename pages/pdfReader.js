/* ==========================================================================
   Page: PDF Reader (/pdf/:lessonId/:index, /pdf/:lessonId/file/:fileId)

   Rebuilt on Mozilla's OFFICIAL PDF.js viewer components (js/pdf/viewerEngine.js
   → js/vendor/pdfjs/pdf_viewer.mjs) instead of the previous hand-rolled
   canvas + custom text-layer + custom pinch-zoom implementation.

   Division of responsibility (per the migration this file is part of):
   - Official PDF.js (PDFViewer/PDFFindController/EventBus) owns: page
     rendering, layout, the lazy-render queue, zoom (incl. scroll-anchor
     preservation on zoom-button taps), the real selectable text layer,
     and search. There is NO custom pinch-gesture code here at all —
     pinch-to-zoom is the browser's own native viewport zoom, which is
     anchored and smooth by construction because it never touches this
     page's DOM/layout.
   - MedPocket (this file) owns: the route, resolving the PDF source
     (local IndexedDB file vs URL), the surrounding topbar/bottom-bar/
     search-bar chrome, theme, and Back navigation.

   The previous implementation is kept at pages/pdfReader.legacy.js
   (unwired, not loaded by index.html) rather than deleted, per the
   requested migration strategy.
   ========================================================================== */

(function (MP) {
  const { topbarHtml, searchBarHtml, loadingHtml, errorHtml, bottomBarHtml } = MP.components.pdfReaderUI;
  const { isSafeUrl } = MP.components.linkViewer;
  const { findLesson } = MP.data;
  const { on, qs, qsa } = MP.dom;

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function resolvePdfSource(params) {
    const found = findLesson(params.lessonId);
    if (!found) return null;
    if (params.fileId) {
      return { lesson: found.lesson, kind: "file", fileId: params.fileId, title: "PDF" };
    }
    const pdfs = (found.lesson.resources && found.lesson.resources.pdfs) || [];
    const entry = pdfs[Number(params.index)];
    if (!entry) return null;
    return { lesson: found.lesson, kind: "url", url: entry.url, title: entry.title || "PDF" };
  }

  function render(params = {}) {
    const resolved = resolvePdfSource(params);
    const title = resolved ? resolved.title : "PDF";
    return `
      <div class="page" data-page="pdf-reader" data-lesson-id="${params.lessonId || ""}">
        ${topbarHtml(title)}
        <div data-pdf-body>${loadingHtml()}</div>
      </div>`;
  }

  function afterRender(root, params = {}) {
    const body = qs("[data-pdf-body]", root);
    const isAlive = () => document.body.contains(root);
    const resolved = resolvePdfSource(params);
    let handle = null;
    let localBlobUrl = null;

    on(root, "click", '[data-action="go-back"]', () => MP.router.back());
    on(root, "click", '[data-action="viewer-open-external"]', () => {
      if (resolved && resolved.kind === "url" && resolved.url && isSafeUrl(resolved.url)) {
        window.open(resolved.url, "_blank", "noopener,noreferrer");
      } else if (localBlobUrl) {
        window.open(localBlobUrl, "_blank", "noopener,noreferrer");
      }
    });

    /* ---------------- annotations (highlights / bookmarks / notes) -------
       Marks live in IndexedDB keyed by a stable document id, so they
       survive closing the reader AND full reloads. Overlays are plain
       absolutely-positioned divs appended INSIDE each PDF.js page div —
       they never touch the canvas or text layer, so selection, search and
       pinch behavior are untouched. Rects are stored as fractions of the
       page box, so zoom/layout changes need no recomputation. */
    let marks = []; // all marks for this document (loaded once per open)
    let docId = null;
    const pageEl = (n) => qs(`.pdfViewer .page[data-page-number="${n}"]`, body);
    const colorVar = { yellow: "--hl-yellow", green: "--hl-green", pink: "--hl-pink" };

    function paintPage(n) {
      const el = pageEl(n);
      if (!el) return;
      // repaint from scratch: cheap (a handful of divs), always consistent
      qsa(".mp-hl-overlay", el).forEach((o) => o.remove());
      marks.filter((m) => m.kind === "highlight" && m.page === n).forEach((m) => {
        (m.rects || []).forEach((r) => {
          if (!r || [r.l, r.t, r.w, r.h].some((v) => typeof v !== "number")) return;
          const box = document.createElement("div");
          box.className = "mp-hl-overlay";
          box.style.left = r.l * 100 + "%";
          box.style.top = r.t * 100 + "%";
          box.style.width = r.w * 100 + "%";
          box.style.height = r.h * 100 + "%";
          box.style.background = `var(${colorVar[m.color] || colorVar.yellow})`;
          box.dataset.markId = m.id;
          el.appendChild(box);
        });
      });
      qsa(".mp-note-pin", el).forEach((p) => p.remove());
      marks.filter((m) => m.kind === "note" && m.page === n).forEach((m) => {
        const pin = document.createElement("button");
        pin.className = "mp-note-pin";
        pin.textContent = "✎";
        pin.dataset.markId = m.id;
        pin.setAttribute("aria-label", "Note: " + (m.note || m.text || "").slice(0, 60));
        el.appendChild(pin);
      });
    }

    function paintBookmarkButton() {
      const btn = qs("[data-pdf-bookmark-btn]", body);
      if (!btn || !handle) return;
      const current = handle.pdfViewer.currentPageNumber;
      const marked = marks.some((m) => m.kind === "bookmark" && m.page === current);
      btn.classList.toggle("is-bookmarked", marked);
    }

    function loadMarks() {
      if (resolved.kind === "url") docId = MP.pdfMarks.docKey("url", resolved.url);
      else docId = MP.pdfMarks.docKey("file", resolved.fileId);
      return MP.pdfMarks.all(docId).then((list) => {
        marks = list;
        for (let n = 1; n <= (handle ? handle.pdfViewer.pagesCount : 0); n++) paintPage(n);
        paintBookmarkButton();
      }).catch(() => { /* annotation storage unavailable → reader still works */ });
    }

    if (!resolved) {
      body.innerHTML = errorHtml("This resource couldn't be found.");
      return;
    }
    if (resolved.kind === "url" && (!resolved.url || !isSafeUrl(resolved.url))) {
      body.innerHTML = errorHtml("No web address is attached to this PDF yet.");
      return;
    }

    // --- shell: official viewer needs a position:absolute scroll container
    // with a single .pdfViewer child; the search bar and bottom bar float
    // above it exactly as they did in the previous reader. ---
    body.innerHTML = `
      ${searchBarHtml()}
      <div class="pdfjsv-shell" data-pdfjsv-shell>
        <div class="pdfjsv-container" data-pdfjsv-container>
          <div class="pdfViewer" data-pdfjsv-inner></div>
        </div>
      </div>
      ${bottomBarHtml()}`;

    const containerEl = qs("[data-pdfjsv-container]", body);
    const viewerEl = qs("[data-pdfjsv-inner]", body);
    const indicatorEl = qs("[data-pdf-page-indicator]", body);
    const countEl = qs("[data-pdf-search-count]", body);

    function updateIndicator() {
      if (!handle || !isAlive()) return;
      const total = handle.pdfViewer.pagesCount || 1;
      const current = handle.pdfViewer.currentPageNumber || 1;
      if (indicatorEl) indicatorEl.textContent = `Page ${current} / ${total}`;
    }

    function fitToWidth() {
      if (!handle || !isAlive()) return;
      handle.pdfViewer.currentScaleValue = "page-width";
    }

    MP.pdfViewerEngine
      .createViewer(containerEl, viewerEl, {
        onPagesInit: fitToWidth,
        onPageChanging: () => { updateIndicator(); paintBookmarkButton(); },
        onScaleChanging: updateIndicator,
        // every (re)render — zoom, lazy-load while scrolling — repaints
        // this page's overlays at its current geometry
        onPageRendered: (evt) => {
          const n = evt && evt.pageNumber;
          if (n && marks.length) paintPage(n);
        },
        onUpdateFindMatchesCount: (evt) => {
          if (!isAlive() || !countEl) return;
          const { current, total } = (evt && evt.matchesCount) || { current: 0, total: 0 };
          countEl.textContent = total ? `${current}/${total}` : "";
        },
      })
      .then((createdHandle) => {
        if (!isAlive()) return;
        handle = createdHandle;

        if (resolved.kind === "url") {
          return MP.pdfViewerEngine.openDocument(handle, { url: resolved.url });
        }
        // Local IndexedDB file: read the real Blob and pass its bytes
        // straight to PDF.js — never uploaded, never converted, never
        // touches a server.
        if (!MP.files) throw new Error("Local file storage isn't available in this browser.");
        return MP.files.get(resolved.fileId).then((record) => {
          if (!record || record.lessonId !== resolved.lesson.id || !record.blob) {
            throw new Error("missing-file");
          }
          const titleEl = qs(".viewer-title", root);
          if (titleEl) titleEl.textContent = record.name || "PDF";
          localBlobUrl = URL.createObjectURL(record.blob);
          return record.blob.arrayBuffer().then((buf) => MP.pdfViewerEngine.openDocument(handle, { data: buf }));
        });
      })
      .then(() => {
        if (!isAlive()) return;
        updateIndicator();
        return loadMarks();
      })
      .catch(() => {
        if (!isAlive()) return;
        body.innerHTML = errorHtml("The document couldn't be loaded. It may be missing or blocked.");
      });

    on(root, "click", '[data-action="pdf-zoom-in"]', () => handle && MP.pdfViewerEngine.zoomBy(handle, 1.25));
    on(root, "click", '[data-action="pdf-zoom-out"]', () => handle && MP.pdfViewerEngine.zoomBy(handle, 1 / 1.25));

    on(root, "click", '[data-action="pdf-jump"]', () => {
      if (!handle) return;
      MP.sheet.open(
        `<h2 class="sheet-title">Go to page</h2>
         <div class="sheet-field">
           <label class="sheet-label">Page number (1–${handle.pdfViewer.pagesCount})</label>
           <input class="sheet-input" type="number" min="1" max="${handle.pdfViewer.pagesCount}" data-field="page" value="${handle.pdfViewer.currentPageNumber}" />
         </div>
         <div class="sheet-actions">
           <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
           <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Go</button>
         </div>`,
        {
          submit: (c) => {
            const n = Number(qs('[data-field="page"]', c).value);
            MP.pdfViewerEngine.jumpToPage(handle, n);
            MP.sheet.close();
          },
        }
      );
    });

    function toggleSearch() {
      const bar = qs("[data-pdf-search-bar]", body);
      if (!bar) return;
      const opening = !bar.classList.contains("is-open");
      bar.classList.toggle("is-open");
      if (opening) {
        qs("[data-pdf-search-input]", bar).focus();
      } else if (handle) {
        MP.pdfViewerEngine.closeSearch(handle);
        if (countEl) countEl.textContent = "";
      }
    }
    on(root, "click", '[data-action="pdf-toggle-search"]', toggleSearch);

    const runSearch = debounce(() => {
      if (!handle) return;
      const input = qs("[data-pdf-search-input]", body);
      const query = input ? input.value.trim() : "";
      MP.pdfViewerEngine.search(handle, query);
    }, 300);
    on(root, "input", "[data-pdf-search-input]", runSearch);
    on(root, "click", '[data-action="pdf-search-next"]', () => {
      if (!handle) return;
      const query = qs("[data-pdf-search-input]", body).value.trim();
      MP.pdfViewerEngine.search(handle, query, { type: "again", previous: false });
    });
    on(root, "click", '[data-action="pdf-search-prev"]', () => {
      if (!handle) return;
      const query = qs("[data-pdf-search-input]", body).value.trim();
      MP.pdfViewerEngine.search(handle, query, { type: "again", previous: true });
    });

    /* ---------------- selection → highlight / copy / note ---------------- */
    const popupHost = qs("[data-pdfjsv-shell]", body);
    let selRects = null; // fraction rects of the active selection
    let selPage = 0;
    let selText = "";

    function hidePopup() {
      const p = qs("[data-pdf-sel-popup]", body);
      if (p) p.remove();
    }

    // Fraction rects for the current window selection, relative to `pageEl`.
    function captureSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
      const text = String(sel).trim();
      if (!text || !selTextAllowed(sel)) return null;
      const range = sel.getRangeAt(0);
      const pageDiv = range.commonAncestorContainer.parentElement
        ? range.commonAncestorContainer.parentElement.closest(".pdfViewer .page")
        : null;
      if (!pageDiv) return null;
      const pageBox = pageDiv.getBoundingClientRect();
      // union of the selection's client rects, clipped to this page
      let u = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
      const rects = [];
      for (let i = 0; i < range.getClientRects().length; i++) {
        const cr = range.getClientRects()[i];
        if (cr.width < 1 && cr.height < 1) continue; // zero-size artifacts
        rects.push({
          l: Math.max(0, (cr.left - pageBox.left) / pageBox.width),
          t: Math.max(0, (cr.top - pageBox.top) / pageBox.height),
          w: Math.min(1, cr.width / pageBox.width),
          h: Math.min(1, cr.height / pageBox.height),
        });
        u.l = Math.min(u.l, cr.left); u.t = Math.min(u.t, cr.top);
        u.r = Math.max(u.r, cr.right); u.b = Math.max(u.b, cr.bottom);
      }
      if (!rects.length) return null;
      return {
        page: Number(pageDiv.dataset.pageNumber),
        text,
        rects,
        anchor: { x: (u.l + u.r) / 2 - pageBox.left, y: u.t - pageBox.top },
        pageBox,
      };
    }

    // Only real text-layer selections count — taps on our own overlays or
    // chrome must never open the popup.
    function selTextAllowed(sel) {
      const node = sel.anchorNode;
      if (!node) return false;
      const el0 = node.nodeType === 3 ? node.parentElement : node;
      return !!(el0 && el0.closest(".textLayer"));
    }

    function showPopup(info) {
      hidePopup();
      const wrap = document.createElement("div");
      wrap.innerHTML = MP.components.pdfReaderUI.selectionPopupHtml();
      const popup = wrap.firstElementChild;
      popupHost.appendChild(popup);
      // position above the selection, clamped to the shell
      const shellBox = popupHost.getBoundingClientRect();
      const x = Math.max(8, Math.min(shellBox.width - popup.offsetWidth - 8, info.anchor.x + 12));
      const y = Math.max(8, info.anchor.y - popup.offsetHeight - 10 + containerEl.getBoundingClientRect().top * 0);
      popup.style.left = x + "px";
      popup.style.top = Math.max(8, info.pageBox.top * 0 + y) + "px";
    }

    // pointerup/selectionchange pair: pointerup fires once per gesture and
    // is where we decide; a short delay lets iOS finish composing the
    // native selection handles.
    on(containerEl, "pointerup", () => setTimeout(() => {
      if (!isAlive()) return;
      const info = captureSelection();
      if (info) {
        selRects = info.rects; selPage = info.page; selText = info.text;
        showPopup(info);
      } else {
        selRects = null; hidePopup();
      }
    }, 60));
    on(popupHost, "pointerdown", '[data-pdf-sel-popup]', (e) => e.stopPropagation());

    on(root, "click", '[data-action="pdf-copy-selection"]', () => {
      if (selText) {
        const done = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(selText)
          : Promise.reject(new Error("no-clipboard-api"));
        done.then(() => MP.toast.show("Copied")).catch(() => MP.toast.show("Couldn't copy — long-press to copy instead", "coral"));
      }
      hidePopup();
      window.getSelection().removeAllRanges();
    });

    on(root, "click", "[data-action='pdf-highlight']", (_e, target) => {
      if (!selRects || !docId) return;
      MP.pdfMarks.add({
        docId, page: selPage, kind: "highlight",
        text: selText, rects: selRects.map((r) => ({
          l: Math.round(r.l * 10000) / 10000, t: Math.round(r.t * 10000) / 10000,
          w: Math.round(r.w * 10000) / 10000, h: Math.round(r.h * 10000) / 10000,
        })),
        color: target.dataset.color || "yellow",
      }).then((rec) => {
        marks.push(rec);
        paintPage(rec.page);
        MP.toast.show("Highlighted");
      }).catch(() => MP.toast.show("Couldn't save highlight", "coral"));
      hidePopup();
      window.getSelection().removeAllRanges();
    });

    on(root, "click", "[data-action='pdf-note-from-selection']", () => {
      if (!docId) return;
      const quoted = selText ? `\n\n— from page ${selPage}: "${selText.slice(0, 200)}"` : "";
      openNoteSheet(selPage || handle.pdfViewer.currentPageNumber, "", quoted, () => {});
    });

    function openNoteSheet(page, existingNote, quotedText, afterSave) {
      MP.sheet.open(
        `<h2 class="sheet-title">Note — page ${page}</h2>
         ${quotedText ? `<p class="sheet-note-quote">${quotedText.replace(/^\n\n/, "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : ""}
         <div class="sheet-field">
           <textarea class="sheet-input" rows="4" data-field="note" placeholder="Write your note…">${existingNote || ""}</textarea>
         </div>
         <div class="sheet-actions">
           ${existingNote ? '<button class="sheet-btn sheet-btn-danger" data-sheet-action="delete-note">Delete</button>' : ""}
           <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
           <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Save</button>
         </div>`,
        {
          submit: (c) => {
            const note = qs('[data-field="note"]', c).value.trim();
            MP.sheet.close();
            afterSave(note);
          },
          action: (action) => {
            if (action === "delete-note") {
              MP.sheet.close();
              afterSave(null); // null → delete
            }
          },
        }
      );
    }

    // Note pins on pages open the editor; bookmark toggles via bottom bar.
    on(body, "click", ".mp-note-pin", (_e, pin) => {
      const rec = marks.find((m) => m.id === pin.dataset.markId);
      if (!rec) return;
      openNoteSheet(rec.page, rec.note, rec.text ? `from page ${rec.page}: "${rec.text.slice(0, 200)}"` : "", (result) => {
        if (result === null) {
          MP.pdfMarks.remove(rec.id).then(() => {
            marks = marks.filter((m) => m.id !== rec.id);
            paintPage(rec.page);
            MP.toast.show("Note deleted");
          });
        } else if (result) {
          MP.pdfMarks.update(rec.id, { note: result }).then(() => {
            rec.note = result;
            paintPage(rec.page);
            MP.toast.show("Note saved");
          });
        }
      });
    });

    on(root, "click", '[data-action="pdf-toggle-bookmark"]', () => {
      if (!handle || !docId) return;
      const current = handle.pdfViewer.currentPageNumber;
      const existing = marks.find((m) => m.kind === "bookmark" && m.page === current);
      if (existing) {
        MP.pdfMarks.remove(existing.id).then(() => {
          marks = marks.filter((m) => m.id !== existing.id);
          paintBookmarkButton();
          MP.toast.show(`Bookmark removed — page ${current}`);
        });
      } else {
        MP.pdfMarks.add({ docId, page: current, kind: "bookmark" }).then((rec) => {
          marks.push(rec);
          paintBookmarkButton();
          MP.toast.show(`Bookmarked page ${current}`);
        }).catch(() => MP.toast.show("Couldn't save bookmark", "coral"));
      }
    });

    on(root, "click", '[data-action="pdf-marks-list"]', () => {
      const items = [...marks].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt);
      const row = (m) => {
        const label =
          m.kind === "bookmark" ? `Page ${m.page}` :
          m.kind === "note" ? `Note — p${m.page}${m.note ? ": " + MP.dom.escapeHtml(m.note.slice(0, 60)) : ""}` :
          `Highlight — p${m.page}${m.text ? ": " + MP.dom.escapeHtml(m.text.slice(0, 60)) : ""}`;
        return `<button class="pdf-marks-row" data-mark-page="${m.page}">${label}</button>`;
      };
      MP.sheet.open(
        `<h2 class="sheet-title">Highlights &amp; bookmarks</h2>
         ${items.length ? `<div class="pdf-marks-list">${items.map(row).join("")}</div>` : '<p class="placeholder-text">Nothing saved in this PDF yet.</p>'}
         <div class="sheet-actions"><button class="sheet-btn sheet-btn-cancel" data-sheet-close>Close</button></div>`,
        {
          action: (c, el) => {},
          submit: () => MP.sheet.close(),
        }
      );
      // jump when tapping a row (delegated inside the sheet root)
      qsa(".pdf-marks-row").forEach((btn) =>
        btn.addEventListener("click", () => {
          MP.pdfViewerEngine.jumpToPage(handle, Number(btn.dataset.markPage));
          MP.sheet.close();
        }, { once: true })
      );
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.pdfReader = { render, afterRender };
})(window.MP = window.MP || {});
