/* ==========================================================================
   Page: Manage Library
   Three nested list views (same pattern as pages/library.js):
     /manage                       -> root: all sections + stats + Add Section
     /manage/:sectionId            -> section: subsections + Add Subsection
     /manage/:sectionId/:subsectionId -> subsection: lessons + Add Lesson

   Phase 5 note: Add/Edit Lesson is now a single "Lesson name" field only.
   Resources (Links / PDFs / Notes) are managed from a separate "Manage
   Lesson" screen reached via the lesson row's "Resources" button, which
   itself opens three focused sub-screens — never one giant form. All of
   these are just different content passed to the SAME global MP.sheet
   singleton (see components/sheet.js), which handles the slide-up entrance
   and the cross-fade between screens; this page only decides what HTML and
   which submit/action callbacks to hand it next.

   Every mutation still goes through MP.data's CRUD helpers, scoped to the
   current Study Space (MP.data.currentSections()) — the same array every
   other screen reads. After a mutation this module re-renders the
   underlying list in place via rerender() (full node replacement +
   re-wiring), which stays safe against the Phase-3 listener bug because
   afterRender always binds to a brand-new page element, never the
   persistent #page-container.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header, breadcrumb, progressSummary, animateProgress } = MP.components;
  const { statsCard, sectionManageCard, subsectionManageCard, lessonManageRow } = MP.components.management;
  const { findSection, findSubsection, findLesson, sectionStats, subsectionStats } = MP.data;
  const { on, qs, qsa, escapeHtml } = MP.dom;

  function pageHeaderBack(title, crumbParts, subtitle) {
    return `
      <div class="page-header">
        <div class="page-header-top">
          <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
        </div>
        ${crumbParts ? breadcrumb(crumbParts) : ""}
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
      </div>`;
  }

  /* ------------------------------- views -------------------------------- */

  function renderRoot() {
    const sections = MP.data.currentSections();
    const space = MP.data.getCurrentSpace();
    return `
      <div class="page" data-page="manage-root">
        ${header({ showSearch: false })}
        <div class="page-header">
          <h1 class="page-title" style="margin-top:8px">Manage Library</h1>
          <p class="page-subtitle">Create and edit sections, subsections, and lessons in ${MP.dom.escapeHtml(space.name)}.</p>
        </div>
        ${statsCard({
          sections: MP.data.totalSectionsCount(),
          subsections: MP.data.totalSubsectionsCount(),
          lessons: MP.data.totalLessonsCount(),
        })}
        <button class="manage-add-btn" data-action="manage-add-section">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Section</button>
        <div class="lesson-list" style="margin-top:14px">
          ${sections.map((s, i) => sectionManageCard(s, i)).join("") || `<p class="placeholder-text">${MP.dom.escapeHtml(space.name)} is empty. Start by adding a section.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderSection(sectionId) {
    const section = findSection(sectionId);
    if (!section) return renderNotFound();
    const stats = sectionStats(section);
    return `
      <div class="page" data-page="manage-section" data-section-id="${section.id}">
        ${pageHeaderBack(section.title, ["Manage Library"])}
        ${progressSummary({ done: stats.done, total: stats.total, hue: section.hue, label: "Section progress" })}
        <button class="manage-add-btn" data-action="manage-add-subsection">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Subsection</button>
        <div class="lesson-list" style="margin-top:14px">
          ${section.subsections.map((sub, i) => subsectionManageCard(sub, section.id, i)).join("") || `<p class="placeholder-text">No subsections yet.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderSubsection(sectionId, subsectionId) {
    const found = findSubsection(sectionId, subsectionId);
    if (!found) return renderNotFound();
    const { section, subsection } = found;
    const stats = subsectionStats(subsection);
    return `
      <div class="page" data-page="manage-subsection" data-section-id="${section.id}" data-subsection-id="${subsection.id}">
        ${pageHeaderBack(subsection.title, ["Manage Library", section.title])}
        ${progressSummary({ done: stats.done, total: stats.total, hue: subsection.hue, label: "Subsection progress" })}
        <button class="manage-add-btn" data-action="manage-add-lesson">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Lesson</button>
        <div class="lesson-list" style="margin-top:14px">
          ${subsection.lessons.map((l, i) => lessonManageRow(l, i)).join("") || `<p class="placeholder-text">No lessons yet.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderNotFound() {
    return `
      <div class="page" data-page="manage-missing">
        ${pageHeaderBack("Not found", ["Manage Library"])}
        <p class="placeholder-text">That item no longer exists.</p>
      </div>`;
  }

  function render(params = {}) {
    if (params.subsectionId) return renderSubsection(params.sectionId, params.subsectionId);
    if (params.sectionId) return renderSection(params.sectionId);
    return renderRoot();
  }

  /* ------------------------ section/subsection forms ---------------------- */

  function sectionFormHtml({ title = "", mode = "create" }) {
    return `
      <h2 class="sheet-title">${mode === "create" ? "Add Section" : "Edit Section"}</h2>
      <div class="sheet-field">
        <label class="sheet-label">Section name</label>
        <input class="sheet-input" data-field="title" value="${escapeHtml(title)}" placeholder="e.g. Internal Medicine" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>${mode === "create" ? "Create Section" : "Save"}</button>
      </div>`;
  }

  function subsectionFormHtml({ title = "", mode = "create" }) {
    return `
      <h2 class="sheet-title">${mode === "create" ? "Add Subsection" : "Edit Subsection"}</h2>
      <div class="sheet-field">
        <label class="sheet-label">Subsection name</label>
        <input class="sheet-input" data-field="title" value="${escapeHtml(title)}" placeholder="e.g. Cardiology" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>${mode === "create" ? "Create Subsection" : "Save"}</button>
      </div>`;
  }

  function confirmFormHtml({ title, message, confirmLabel = "Delete" }) {
    return `
      <h2 class="sheet-title">${title}</h2>
      <p class="sheet-message">${message}</p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-danger" data-sheet-submit>${confirmLabel}</button>
      </div>`;
  }

  /* --------------------------- lesson: simple forms ------------------------ */

  // Phase 5: Add/Edit Lesson is ONE field. Nothing else. Description is
  // still a field in the data model (untouched) — it's just no longer
  // exposed by this form, per the "no huge forms" requirement.
  function lessonNameFormHtml({ title = "", mode = "create" }) {
    return `
      <h2 class="sheet-title">${mode === "create" ? "Add Lesson" : "Edit Lesson"}</h2>
      <div class="sheet-field">
        <label class="sheet-label">Lesson name</label>
        <input class="sheet-input" data-field="title" value="${escapeHtml(title)}" placeholder="e.g. Heart Failure" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>${mode === "create" ? "Create Lesson" : "Save"}</button>
      </div>`;
  }

  /* -------------------------- lesson: resource screens ---------------------- */

  function manageLessonHtml(lesson) {
    const res = lesson.resources || {};
    const linkCount = Array.isArray(res.links) ? res.links.length : 0;
    const pdfCount = Array.isArray(res.pdfs) ? res.pdfs.length : 0;
    const hasNotes = !!(res.notes && res.notes.trim());
    return `
      <h2 class="sheet-title">${escapeHtml(lesson.title)}</h2>
      <button class="sheet-inline-edit-btn" data-sheet-action="edit-lesson-name">Rename lesson</button>
      <p class="sheet-heading-inline">Resources</p>
      <div class="resource-summary-list">
        <button class="resource-summary-row" data-sheet-action="open-links">
          <span>🔗 Links</span><span class="resource-summary-count">${linkCount}</span>
        </button>
        <button class="resource-summary-row" data-sheet-action="open-pdfs">
          <span>📄 PDFs</span><span class="resource-summary-count">${pdfCount}</span>
        </button>
        <button class="resource-summary-row" data-sheet-action="open-notes">
          <span>📝 Notes</span><span class="resource-summary-count">${hasNotes ? "Added" : "None"}</span>
        </button>
      </div>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Done</button>
      </div>`;
  }

  function linkRowHtml(url) {
    return `
      <div class="resource-row" data-link-row>
        <input class="sheet-input" type="url" data-link-url value="${escapeHtml(url || "")}" placeholder="https://…" />
        <button class="row-delete-btn" data-sheet-action="remove-link-row" aria-label="Delete link">🗑</button>
      </div>`;
  }

  function linksScreenHtml(links) {
    return `
      <h2 class="sheet-title">Links</h2>
      <div data-links-list>
        ${links.length ? links.map((l) => linkRowHtml(l.url)).join("") : `<p class="sheet-empty" data-links-empty>No links yet.</p>`}
      </div>
      <button class="sheet-add-row-btn" data-sheet-action="add-link-row">${icon("more", { size: 13, strokeWidth: 2.6 })} Add Link</button>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-action="back-to-lesson">Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Done</button>
      </div>`;
  }

  function pdfRowHtml(title, url) {
    return `
      <div class="resource-row" data-pdf-row data-title="${escapeHtml(title)}" style="display:block">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="resource-row-icon">📄</span>
          <span class="resource-row-text">${escapeHtml(title)}</span>
          <button class="row-delete-btn" data-sheet-action="remove-pdf-row" aria-label="Delete PDF">🗑</button>
        </div>
        <input class="sheet-input" type="url" data-pdf-url value="${escapeHtml(url || "")}" placeholder="Optional: paste a URL to this PDF" style="margin-top:8px" />
      </div>`;
  }

  function pdfsScreenHtml(pdfs) {
    return `
      <h2 class="sheet-title">PDFs</h2>
      <div data-pdfs-list>
        ${pdfs.length ? pdfs.map((p) => pdfRowHtml(p.title, p.url)).join("") : `<p class="sheet-empty" data-pdfs-empty>No PDFs yet.</p>`}
      </div>
      <label class="sheet-add-row-btn" style="cursor:pointer">
        ${icon("more", { size: 13, strokeWidth: 2.6 })} Add PDF
        <input type="file" accept="application/pdf,.pdf" data-sheet-action="pdf-file-selected" style="display:none" />
      </label>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-action="back-to-lesson">Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Done</button>
      </div>`;
  }

  function notesScreenHtml(notes) {
    return `
      <h2 class="sheet-title">Notes</h2>
      <div class="sheet-field">
        <textarea class="sheet-textarea" data-field="notes" placeholder="Write your notes…" style="min-height:160px">${escapeHtml(notes || "")}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-action="back-to-lesson">Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Save</button>
      </div>`;
  }

  const isLikelyUrl = (u) => /^https?:\/\/\S+/i.test(u.trim());

  /* -------------------------------- wiring -------------------------------- */

  function afterRender(root, params = {}) {
    animateProgress(root);

    function rerender() {
      const scrollBox = document.getElementById("page-container");
      const savedScroll = scrollBox ? scrollBox.scrollTop : 0;
      const parent = root.parentNode;
      if (!parent) return;
      const html = render(params);
      root.outerHTML = html;
      const freshRoot = MP.dom.qs(".page", parent);
      if (freshRoot) afterRender(freshRoot, params);
      if (scrollBox) scrollBox.scrollTop = savedScroll;
    }

    on(root, "click", '[data-action="go-back"]', () => MP.router.back());
    on(root, "click", '[data-action="manage-open-section"]', (_e, t) => MP.router.push(`/manage/${t.dataset.section}`));
    on(root, "click", '[data-action="manage-open-subsection"]', (_e, t) => MP.router.push(`/manage/${t.dataset.section}/${t.dataset.subsection}`));

    /* ---- Section CRUD (name-only, per Phase 5.1) ---- */
    on(root, "click", '[data-action="manage-add-section"]', () => {
      MP.sheet.open(sectionFormHtml({ mode: "create" }), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.addSection({ title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Section created", "teal");
          rerender();
        },
      });
    });
    on(root, "click", '[data-action="manage-edit-section"]', (_e, t) => {
      const section = findSection(t.dataset.section);
      if (!section) return;
      MP.sheet.open(sectionFormHtml({ title: section.title, mode: "edit" }), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.updateSection(section.id, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Section updated", "teal");
          rerender();
        },
      });
    });
    on(root, "click", '[data-action="manage-delete-section"]', (_e, t) => {
      const section = findSection(t.dataset.section);
      if (!section) return;
      MP.sheet.open(
        confirmFormHtml({
          title: `Delete "${section.title}"?`,
          message: "This will permanently remove this section, all its subsections, all their lessons, and every associated resource.",
        }),
        {
          submit: () => {
            const wasCurrent = params.sectionId === section.id;
            const result = MP.data.deleteSection(section.id);
            MP.sheet.close();
            if (!result.ok) return MP.toast && MP.toast.show(result.error, "coral");
            MP.toast && MP.toast.show("Deleted", "coral");
            wasCurrent ? MP.router.back() : rerender();
          },
        }
      );
    });

    /* ---- Subsection CRUD (name-only, per Phase 5.1) ---- */
    on(root, "click", '[data-action="manage-add-subsection"]', () => {
      MP.sheet.open(subsectionFormHtml({ mode: "create" }), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.addSubsection(params.sectionId, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Subsection created", "teal");
          rerender();
        },
      });
    });
    on(root, "click", '[data-action="manage-edit-subsection"]', (_e, t) => {
      const found = findSubsection(t.dataset.section, t.dataset.subsection);
      if (!found) return;
      MP.sheet.open(subsectionFormHtml({ title: found.subsection.title, mode: "edit" }), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.updateSubsection(found.section.id, found.subsection.id, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Subsection updated", "teal");
          rerender();
        },
      });
    });
    on(root, "click", '[data-action="manage-delete-subsection"]', (_e, t) => {
      const found = findSubsection(t.dataset.section, t.dataset.subsection);
      if (!found) return;
      MP.sheet.open(
        confirmFormHtml({
          title: `Delete "${found.subsection.title}"?`,
          message: "This will permanently remove this subsection, all its lessons, and every associated resource.",
        }),
        {
          submit: () => {
            const wasCurrent = params.subsectionId === found.subsection.id;
            const result = MP.data.deleteSubsection(found.section.id, found.subsection.id);
            MP.sheet.close();
            if (!result.ok) return MP.toast && MP.toast.show(result.error, "coral");
            MP.toast && MP.toast.show("Deleted", "coral");
            wasCurrent ? MP.router.back() : rerender();
          },
        }
      );
    });

    /* ---- Lesson: simple name-only Add/Edit ---- */
    function openLessonNameForm(existingLesson) {
      const mode = existingLesson ? "edit" : "create";
      MP.sheet.open(lessonNameFormHtml({ title: existingLesson ? existingLesson.title : "", mode }), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = existingLesson
            ? MP.data.updateLesson(existingLesson.id, { title })
            : MP.data.addLesson(params.sectionId, params.subsectionId, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show(existingLesson ? "Lesson updated" : "Lesson created", "teal");
          rerender();
        },
      });
    }
    on(root, "click", '[data-action="manage-add-lesson"]', () => openLessonNameForm(null));
    on(root, "click", '[data-action="manage-edit-lesson"]', (_e, t) => {
      const found = findLesson(t.dataset.lesson);
      if (found) openLessonNameForm(found.lesson);
    });
    on(root, "click", '[data-action="manage-delete-lesson"]', (_e, t) => {
      const found = findLesson(t.dataset.lesson);
      if (!found) return;
      MP.sheet.open(
        confirmFormHtml({
          title: `Delete "${found.lesson.title}"?`,
          message: "This will permanently remove this lesson and its resources. Its progress and search entry will also be removed.",
        }),
        {
          submit: () => {
            const result = MP.data.deleteLesson(found.lesson.id);
            MP.sheet.close();
            if (!result.ok) return MP.toast && MP.toast.show(result.error, "coral");
            MP.toast && MP.toast.show("Deleted", "coral");
            rerender();
          },
        }
      );
    });

    /* ---- Lesson: resource management (Links / PDFs / Notes) ---- */
    function openManageLesson(lessonId) {
      const found = findLesson(lessonId);
      if (!found) return;
      MP.sheet.open(manageLessonHtml(found.lesson), {
        submit: () => {
          MP.sheet.close();
          rerender();
        },
        action: (action) => {
          if (action === "edit-lesson-name") openLessonNameForm(found.lesson);
          else if (action === "open-links") openLinksScreen(lessonId);
          else if (action === "open-pdfs") openPdfsScreen(lessonId);
          else if (action === "open-notes") openNotesScreen(lessonId);
        },
      });
    }
    on(root, "click", '[data-action="manage-lesson-resources"]', (_e, t) => openManageLesson(t.dataset.lesson));

    // Row-level mark-as-complete on Manage lesson rows — identical wiring
    // to pages/library.js (same MP.state.toggleCompleted, in-place update).
    on(root, "click", '[data-action="toggle-row-complete"]', (_e, target) => {
      const found = findLesson(target.dataset.lesson);
      if (!found) return;
      const next = MP.state.toggleCompleted(found.lesson.id, found.lesson.completed);
      target.classList.toggle("is-done", next);
      const card = target.closest(".lesson-card");
      if (card) {
        const badge = qs(".badge", card);
        if (badge) badge.outerHTML = MP.dom.statusBadge(next);
      }
      MP.toast && MP.toast.show(next ? "Marked as complete" : "Marked as not started", next ? "teal" : "coral");
    });

    function openLinksScreen(lessonId) {
      const found = findLesson(lessonId);
      if (!found) return;
      const links = Array.isArray(found.lesson.resources.links) ? found.lesson.resources.links : [];
      MP.sheet.open(linksScreenHtml(links), {
        submit: (c) => {
          const inputs = qsa("[data-link-url]", c);
          const urls = inputs.map((i) => i.value.trim()).filter(Boolean);
          const bad = urls.find((u) => !isLikelyUrl(u));
          if (bad) return MP.sheet.setError("Links must start with http:// or https://");
          MP.data.updateLesson(lessonId, { resources: { links: urls.map((url) => ({ url })) } });
          MP.toast && MP.toast.show("Links saved", "teal");
          openManageLesson(lessonId);
        },
        action: (action, target, content) => {
          if (action === "back-to-lesson") return openManageLesson(lessonId);
          if (action === "add-link-row") {
            const list = qs("[data-links-list]", content);
            const empty = qs("[data-links-empty]", list);
            if (empty) empty.remove();
            list.insertAdjacentHTML("beforeend", linkRowHtml(""));
            const row = list.lastElementChild;
            row.classList.add("reveal");
            const newInput = qs("[data-link-url]", row);
            if (newInput) newInput.focus();
          }
          if (action === "remove-link-row") {
            const row = target.closest("[data-link-row]");
            if (row) row.remove();
            const list = qs("[data-links-list]", content);
            if (list && !qs("[data-link-row]", list)) {
              list.insertAdjacentHTML("beforeend", `<p class="sheet-empty" data-links-empty>No links yet.</p>`);
            }
          }
        },
      });
    }

    function openPdfsScreen(lessonId) {
      const found = findLesson(lessonId);
      if (!found) return;
      const pdfs = Array.isArray(found.lesson.resources.pdfs) ? found.lesson.resources.pdfs : [];
      MP.sheet.open(pdfsScreenHtml(pdfs), {
        submit: (c) => {
          const rows = qsa("[data-pdf-row]", c);
          const nextPdfs = rows.map((r) => ({ title: r.dataset.title, url: (qs("[data-pdf-url]", r) || {}).value || "" }));
          MP.data.updateLesson(lessonId, { resources: { pdfs: nextPdfs } });
          MP.toast && MP.toast.show("PDFs saved", "teal");
          openManageLesson(lessonId);
        },
        action: (action, target, content) => {
          if (action === "back-to-lesson") return openManageLesson(lessonId);
          if (action === "pdf-file-selected") {
            const file = target.files && target.files[0];
            target.value = ""; // allow re-selecting the same file later
            if (!file) return;
            const list = qs("[data-pdfs-list]", content);
            const empty = qs("[data-pdfs-empty]", list);
            if (empty) empty.remove();
            list.insertAdjacentHTML("beforeend", pdfRowHtml(file.name));
            list.lastElementChild.classList.add("reveal");
          }
          if (action === "remove-pdf-row") {
            const row = target.closest("[data-pdf-row]");
            if (row) row.remove();
            const list = qs("[data-pdfs-list]", content);
            if (list && !qs("[data-pdf-row]", list)) {
              list.insertAdjacentHTML("beforeend", `<p class="sheet-empty" data-pdfs-empty>No PDFs yet.</p>`);
            }
          }
        },
      });
    }

    function openNotesScreen(lessonId) {
      const found = findLesson(lessonId);
      if (!found) return;
      MP.sheet.open(notesScreenHtml(found.lesson.resources.notes), {
        submit: (c) => {
          const notes = qs('[data-field="notes"]', c).value;
          MP.data.updateLesson(lessonId, { resources: { notes } });
          MP.toast && MP.toast.show("Notes saved", "teal");
          openManageLesson(lessonId);
        },
        action: (action) => {
          if (action === "back-to-lesson") openManageLesson(lessonId);
        },
      });
    }
  }

  MP.pages = MP.pages || {};
  MP.pages.manage = { render, afterRender };
})(window.MP = window.MP || {});
