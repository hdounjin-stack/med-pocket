/* ==========================================================================
   Page: Lesson Detail

   Resources are now managed directly from the lesson via ONE
   "+ Add Resource" button (Link / PDF / Word / PowerPoint / Note /
   Other File) instead of separate PDF-only / Link-only flows, and
   instead of leaving Library to use Manage Library. All resource types
   render in a single compact list.

   Links / PDF-by-URL / Notes still live on the lesson object itself
   (MP.data, unchanged shape). Local files picked from the device (PDF /
   Word / PowerPoint / Other) are never put on the lesson object — they
   live in IndexedDB via MP.files, keyed by lessonId (see js/files.js),
   and are fetched asynchronously each time this page mounts.

   "Mark as Complete" still writes real (in-memory) app state via
   MP.state, so every other screen reflects it immediately.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { breadcrumb } = MP.components;
  const { resourceCard, statusBody } = MP.components.resourceCard;
  const { friendlyLabel } = MP.components.linkViewer;
  const { findLesson, isCompleted } = MP.data;
  const { on, qs, escapeHtml } = MP.dom;

  function completeButton(done) {
    return `
      <button class="complete-btn ${done ? "is-done" : ""}" data-action="toggle-complete" data-lesson-toggle>
        <span class="complete-icon">${icon("checkCircle", { size: 18, strokeWidth: 2.3 })}</span>
        <span data-complete-label>${done ? "Completed" : "Mark as Complete"}</span>
      </button>`;
  }

  /* ------------------------- unified resource list ------------------------- */

  function localFileIcon(type) {
    if (type === "pdf") return "📄";
    if (type === "word") return "📘";
    if (type === "ppt") return "📊";
    return "📁";
  }

  function resourceRowHtml({ iconEmoji, text, restype, index, fileId }) {
    const refAttr = fileId != null ? `data-file-id="${escapeHtml(fileId)}"` : index != null ? `data-index="${index}"` : "";
    return `
      <div class="lesson-resource-row" data-resource-row>
        <button class="lesson-resource-open" data-action="open-resource" data-restype="${restype}" ${refAttr}>
          <span class="lesson-resource-icon">${iconEmoji}</span>
          <span class="lesson-resource-text">${text}</span>
        </button>
        <button class="row-delete-btn" data-action="delete-resource" data-restype="${restype}" ${refAttr} aria-label="Remove resource">${icon("x", { size: 13, strokeWidth: 2.4 })}</button>
      </div>`;
  }

  // `localFiles` is either null (not loaded yet) or the array from MP.files.listForLesson.
  function resourceListInnerHtml(lesson, localFiles) {
    const res = lesson.resources || {};
    const links = Array.isArray(res.links) ? res.links : [];
    const pdfs = Array.isArray(res.pdfs) ? res.pdfs : [];
    const hasNote = !!(res.notes && String(res.notes).trim());

    const rows = [];
    links.forEach((l, i) => rows.push(resourceRowHtml({ iconEmoji: "🔗", text: escapeHtml(friendlyLabel(l)), restype: "link", index: i })));
    pdfs.forEach((p, i) => rows.push(resourceRowHtml({ iconEmoji: "📄", text: escapeHtml(p.title || "PDF"), restype: "pdf-url", index: i })));
    (localFiles || []).forEach((f) =>
      rows.push(resourceRowHtml({ iconEmoji: localFileIcon(f.type), text: escapeHtml(f.name), restype: "file", fileId: f.id }))
    );
    if (hasNote) rows.push(resourceRowHtml({ iconEmoji: "📝", text: "Notes", restype: "note" }));

    const emptyLoading = localFiles === null;
    return `
      <div class="lesson-resource-list">
        ${rows.length ? rows.join("") : `<p class="sheet-empty">${emptyLoading ? "Loading resources…" : "No resources yet."}</p>`}
      </div>
      <button class="manage-add-btn" data-action="add-resource" style="margin-top:10px">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Resource</button>`;
  }

  function render(params = {}) {
    const found = findLesson(params.lessonId);
    if (!found) {
      return `
        <div class="page" data-page="lesson-missing">
          <button class="back-btn" data-action="go-back" style="margin:4px 0 14px">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
          <p class="placeholder-text">That lesson doesn't exist yet.</p>
        </div>`;
    }
    const { section, subsection, lesson } = found;
    const done = isCompleted(lesson);

    return `
      <div class="page" data-page="lesson" data-lesson-id="${lesson.id}">
        <div class="lesson-hero">
          <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
          <div style="margin-top:14px">${breadcrumb([section.title, subsection.title])}</div>
          <h1 class="lesson-hero-title">${lesson.title}</h1>
        </div>

        ${completeButton(done)}

        <div class="lesson-resource-block">
          <p class="sheet-heading-inline" style="margin-top:0">Resources</p>
          <div data-resource-section>${resourceListInnerHtml(lesson, null)}</div>
        </div>

        <div class="resource-grid" style="margin-top:16px">
          <div data-status-card>
            ${resourceCard({
              label: "Status",
              iconName: "checkCircle",
              hue: "teal",
              body: statusBody(done),
              index: 0,
              kind: "status",
              toastMessage: "Use \u2018Mark as Complete\u2019 above to update this",
            })}
          </div>
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  const isLikelyUrl = (u) => /^https?:\/\/\S+/i.test(String(u || "").trim());

  function afterRender(root) {
    // `root` is now the freshly-created `.page[data-page="lesson"]` element
    // itself (see router.js), not an ancestor — so we use it directly
    // rather than querying for it as a descendant.
    const pageEl = root && root.dataset && root.dataset.page === "lesson" ? root : qs("[data-page='lesson']", root);
    if (!pageEl) {
      on(root, "click", '[data-action="go-back"]', () => MP.router.back());
      return;
    }
    const lessonId = pageEl.dataset.lessonId;

    on(root, "click", '[data-action="go-back"]', () => MP.router.back());

    on(root, "click", '[data-action="resource-tap"]', (_e, target) => {
      const message = target.dataset.toast || "Coming soon";
      MP.toast && MP.toast.show(message, "violet");
    });

    on(root, "click", '[data-action="toggle-complete"]', (_e, target) => {
      const found = findLesson(lessonId);
      if (!found) return;
      const next = MP.state.toggleCompleted(lessonId, found.lesson.completed);

      // Targeted DOM update — no full page re-render, no route change.
      target.classList.toggle("is-done", next);
      const label = qs("[data-complete-label]", target);
      if (label) label.textContent = next ? "Completed" : "Mark as Complete";

      const statusCard = qs("[data-status-card]", root);
      if (statusCard) {
        const badge = qs(".badge", statusCard);
        if (badge) badge.outerHTML = statusBody(next);
      }

      MP.toast && MP.toast.show(next ? "Marked as complete" : "Marked as not started", next ? "teal" : "coral");
    });

    /* -------------------------- resource list refresh -------------------------- */

    function refreshResourceSection() {
      const found = findLesson(lessonId);
      if (!found) return Promise.resolve();
      const container = qs("[data-resource-section]", root);
      const listFiles = MP.files ? MP.files.listForLesson(lessonId).catch(() => []) : Promise.resolve([]);
      return listFiles.then((files) => {
        if (container) container.innerHTML = resourceListInnerHtml(found.lesson, files);
      });
    }
    refreshResourceSection();

    /* ------------------------------ open resource ------------------------------ */

    on(root, "click", '[data-action="open-resource"]', (_e, target) => {
      const restype = target.dataset.restype;
      if (restype === "link") {
        MP.router.push(`/link/${lessonId}/${target.dataset.index}`);
      } else if (restype === "pdf-url") {
        MP.router.push(`/pdf/${lessonId}/${target.dataset.index}`);
      } else if (restype === "note") {
        openNoteEditor();
      } else if (restype === "file") {
        const fileId = target.dataset.fileId;
        if (!MP.files) return;
        MP.files.get(fileId).then((record) => {
          if (!record) return;
          if (record.type === "pdf") MP.router.push(`/pdf/${lessonId}/file/${fileId}`);
          else MP.router.push(`/file/${lessonId}/${fileId}`);
        });
      }
    });

    /* ----------------------------- delete resource ------------------------------ */

    on(root, "click", '[data-action="delete-resource"]', (_e, target) => {
      const restype = target.dataset.restype;
      const found = findLesson(lessonId);
      if (!found) return;

      if (restype === "link") {
        const links = (found.lesson.resources.links || []).slice();
        links.splice(Number(target.dataset.index), 1);
        MP.data.updateLesson(lessonId, { resources: { links } });
        MP.toast && MP.toast.show("Link removed", "coral");
        refreshResourceSection();
      } else if (restype === "pdf-url") {
        const pdfs = (found.lesson.resources.pdfs || []).slice();
        pdfs.splice(Number(target.dataset.index), 1);
        MP.data.updateLesson(lessonId, { resources: { pdfs } });
        MP.toast && MP.toast.show("PDF removed", "coral");
        refreshResourceSection();
      } else if (restype === "note") {
        MP.data.updateLesson(lessonId, { resources: { notes: "" } });
        MP.toast && MP.toast.show("Note removed", "coral");
        refreshResourceSection();
      } else if (restype === "file") {
        if (!MP.files) return;
        MP.files.delete(target.dataset.fileId).then(() => {
          MP.toast && MP.toast.show("File removed", "coral");
          refreshResourceSection();
        });
      }
    });

    /* ------------------------------ + Add Resource ------------------------------ */

    function pickerSheetHtml() {
      return `
        <h2 class="sheet-title">Add Resource</h2>
        <div class="resource-summary-list" style="margin-top:8px">
          <button class="resource-summary-row" data-sheet-action="pick-link"><span>🔗 Link</span></button>
          <label class="resource-summary-row" style="cursor:pointer">
            <span>📄 PDF</span>
            <input type="file" accept="application/pdf,.pdf" data-sheet-action="pick-file" data-restype="pdf" style="display:none" />
          </label>
          <label class="resource-summary-row" style="cursor:pointer">
            <span>📘 Word</span>
            <input type="file" accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-sheet-action="pick-file" data-restype="word" style="display:none" />
          </label>
          <label class="resource-summary-row" style="cursor:pointer">
            <span>📊 PowerPoint</span>
            <input type="file" accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" data-sheet-action="pick-file" data-restype="ppt" style="display:none" />
          </label>
          <button class="resource-summary-row" data-sheet-action="pick-note"><span>📝 Note</span></button>
          <label class="resource-summary-row" style="cursor:pointer">
            <span>📁 Other File</span>
            <input type="file" data-sheet-action="pick-file" data-restype="other" style="display:none" />
          </label>
        </div>
        <div class="sheet-actions">
          <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        </div>`;
    }

    function openAddResourcePicker() {
      if (!MP.sheet) return;
      MP.sheet.open(pickerSheetHtml(), {
        action: (action, target) => {
          if (action === "pick-link") openAddLinkForm();
          else if (action === "pick-note") openNoteEditor();
          else if (action === "pick-file") handleFilePicked(target);
        },
      });
    }
    on(root, "click", '[data-action="add-resource"]', () => openAddResourcePicker());

    function openAddLinkForm() {
      MP.sheet.open(
        `<h2 class="sheet-title">Add Link</h2>
         <div class="sheet-field">
           <label class="sheet-label">URL</label>
           <input class="sheet-input" type="url" data-field="url" placeholder="https://…" />
         </div>
         <p class="sheet-error" data-sheet-error></p>
         <div class="sheet-actions">
           <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
           <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Add Link</button>
         </div>`,
        {
          submit: (c) => {
            const url = qs('[data-field="url"]', c).value.trim();
            if (!isLikelyUrl(url)) return MP.sheet.setError("Links must start with http:// or https://");
            const found = findLesson(lessonId);
            if (!found) return;
            const links = (found.lesson.resources.links || []).concat([{ url }]);
            MP.data.updateLesson(lessonId, { resources: { links } });
            MP.sheet.close();
            MP.toast && MP.toast.show("Link added", "teal");
            refreshResourceSection();
          },
        }
      );
    }

    function openNoteEditor() {
      const found = findLesson(lessonId);
      const current = (found && found.lesson.resources.notes) || "";
      MP.sheet.open(
        `<h2 class="sheet-title">Note</h2>
         <div class="sheet-field">
           <textarea class="sheet-textarea" data-field="notes" placeholder="Write your notes…" style="min-height:160px">${escapeHtml(current)}</textarea>
         </div>
         <div class="sheet-actions">
           <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
           <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Save</button>
         </div>`,
        {
          submit: (c) => {
            const notes = qs('[data-field="notes"]', c).value;
            MP.data.updateLesson(lessonId, { resources: { notes } });
            MP.sheet.close();
            MP.toast && MP.toast.show("Note saved", "teal");
            refreshResourceSection();
          },
        }
      );
    }

    function handleFilePicked(inputEl) {
      const file = inputEl.files && inputEl.files[0];
      inputEl.value = ""; // allow re-selecting the same file later
      if (!file) return; // fires once on the label's click-bubble before the dialog opens — harmless
      if (!MP.files) {
        MP.toast && MP.toast.show("Local file storage isn't available in this browser", "coral");
        return;
      }
      const restype = inputEl.dataset.restype;
      MP.files
        .add({ lessonId, name: file.name, type: restype, size: file.size, blob: file })
        .then(() => {
          MP.sheet.close();
          const label = restype === "pdf" ? "PDF" : restype === "word" ? "Word document" : restype === "ppt" ? "PowerPoint" : "File";
          MP.toast && MP.toast.show(`${label} added`, "teal");
          refreshResourceSection();
        })
        .catch(() => {
          MP.toast && MP.toast.show("Couldn't save file", "coral");
        });
    }
  }

  MP.pages = MP.pages || {};
  MP.pages.lesson = { render, afterRender };
})(window.MP = window.MP || {});
