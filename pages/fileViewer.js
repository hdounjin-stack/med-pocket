/* ==========================================================================
   Page: File Viewer (/file/:lessonId/:fileId)

   For local Word / PowerPoint / Other files stored in IndexedDB via
   MP.files. PDF.js only renders PDFs (see js/pdf/engine.js), so this
   screen never pretends to render these — it shows the file and offers
   "Open" (via a Blob URL, the closest thing to "Open Externally" a
   locally-picked file has, since there is no real external web address)
   plus a Delete action. Genuinely PDF local files go through the
   existing PDF Reader instead (see pages/pdfReader.js, /pdf/:lessonId/file/:fileId).
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { topbarHtml } = MP.components.linkViewer;
  const { findLesson } = MP.data;
  const { on, qs, escapeHtml } = MP.dom;

  const TYPE_META = {
    word: { emoji: "📘", label: "Word Document" },
    ppt: { emoji: "📊", label: "PowerPoint Presentation" },
    pdf: { emoji: "📄", label: "PDF Document" },
    other: { emoji: "📁", label: "File" },
  };

  function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function render(params = {}) {
    const found = findLesson(params.lessonId);
    return `
      <div class="page" data-page="file-viewer" data-lesson-id="${params.lessonId}" data-file-id="${params.fileId}">
        ${topbarHtml(found ? "File" : "Not found")}
        <div class="placeholder-wrap" data-file-body>
          <div class="skeleton" style="width:56px;height:56px;border-radius:16px;margin:0 auto 14px"></div>
          <div class="skeleton" style="width:50%;height:14px;border-radius:6px;margin:0 auto"></div>
        </div>
      </div>`;
  }

  function bodyHtml(record) {
    const meta = TYPE_META[record.type] || TYPE_META.other;
    return `
      <div class="placeholder-wrap">
        <span class="placeholder-icon hue-violet" style="font-size:26px">${meta.emoji}</span>
        <p class="placeholder-title">${escapeHtml(record.name)}</p>
        <p class="placeholder-text">${meta.label}${record.size != null ? " · " + formatSize(record.size) : ""}</p>
        <button class="sheet-btn sheet-btn-primary" style="margin-top:14px" data-action="viewer-open-external">
          Open ${icon("arrowUpRight", { size: 13, strokeWidth: 2.6 })}
        </button>
        <button class="sheet-btn sheet-btn-cancel" style="margin-top:10px" data-action="file-delete">
          Delete
        </button>
      </div>`;
  }

  function errorBodyHtml(message) {
    return `
      <div class="placeholder-wrap">
        <span class="placeholder-icon hue-coral">${icon("x", { size: 26, strokeWidth: 2.2 })}</span>
        <p class="placeholder-title">Can't open this file</p>
        <p class="placeholder-text">${escapeHtml(message)}</p>
      </div>`;
  }

  function afterRender(root, params = {}) {
    on(root, "click", '[data-action="go-back"]', () => MP.router.back());

    const body = qs("[data-file-body]", root);
    const isAlive = () => document.body.contains(root);
    let blobUrl = null;
    let currentRecord = null;

    on(root, "click", '[data-action="viewer-open-external"]', () => {
      if (blobUrl) window.open(blobUrl, "_blank", "noopener,noreferrer");
    });

    on(root, "click", '[data-action="file-delete"]', () => {
      if (!MP.files || !currentRecord) return;
      MP.files
        .delete(currentRecord.id)
        .then(() => {
          MP.toast && MP.toast.show("File removed", "coral");
          MP.router.back();
        })
        .catch(() => {
          MP.toast && MP.toast.show("Couldn't remove file", "coral");
        });
    });

    if (!MP.files) {
      body.innerHTML = errorBodyHtml("Local file storage isn't available in this browser.");
      return;
    }

    MP.files
      .get(params.fileId)
      .then((record) => {
        if (!isAlive()) return;
        if (!record || record.lessonId !== params.lessonId) {
          body.innerHTML = errorBodyHtml("This file may have been removed.");
          return;
        }
        currentRecord = record;
        const titleEl = qs(".viewer-title", root);
        if (titleEl) titleEl.textContent = record.name || "File";
        if (record.blob) blobUrl = URL.createObjectURL(record.blob);
        body.innerHTML = bodyHtml(record);
      })
      .catch(() => {
        if (!isAlive()) return;
        body.innerHTML = errorBodyHtml("This file couldn't be loaded.");
      });
  }

  MP.pages = MP.pages || {};
  MP.pages.fileViewer = { render, afterRender };
})(window.MP = window.MP || {});
