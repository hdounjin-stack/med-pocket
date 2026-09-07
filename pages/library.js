/* ==========================================================================
   Page: Library
   Flow: Library -> Section -> Subsection (lessons) -> Lesson
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { header, categoryCard, lessonCard, breadcrumb, progressSummary, animateProgress } = MP.components;
  const { findSection, findSubsection, sectionStats, subsectionStats } = MP.data;
  const { on, qs, pct, escapeHtml } = MP.dom;

  function pageHeaderBack(title, crumbParts) {
    return `
      <div class="page-header">
        <div class="page-header-top">
          <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
        </div>
        ${crumbParts ? breadcrumb(crumbParts) : ""}
        <h1 class="page-title">${title}</h1>
      </div>`;
  }

  function subsectionCard(subsection, hue, index, sectionId) {
    const { done, total } = subsectionStats(subsection);
    const p = pct(done, total);
    return `
      <button class="cat-card card card-press reveal" style="animation-delay:${70 + index * 55}ms"
        data-action="open-subsection" data-section="${sectionId}" data-subsection="${subsection.id}">
        <div class="cat-top">
          <span class="cat-icon hue-${hue}">${icon(MP.components.management.subIcon(subsection.title), { size: 17, strokeWidth: 2.1 })}</span>
          ${MP.components.radialRing({ value: p, size: 34, stroke: 4 })}
        </div>
        <div class="cat-body">
          <h3 class="cat-title">${subsection.title}</h3>
          <p class="cat-desc">${subsection.desc}</p>
        </div>
        <div class="cat-foot">
          <span class="cat-count">${done}<span class="cat-count-total">/${total}</span></span>
          ${icon("chevronRight", { size: 16, strokeWidth: 2.4, className: "cat-chevron" })}
        </div>
        ${MP.components.bar({ value: p, hue })}
      </button>`;
  }

  function renderRoot() {
    const sections = MP.data.currentSections();
    const space = MP.data.getCurrentSpace();
    return `
      <div class="page" data-page="library" data-route-key="/library">
        ${header({ showSearch: true })}
        <div class="page-header">
          <h1 class="page-title" style="margin-top:8px">Library</h1>
          <p class="page-subtitle">Browse by section, then drill into lessons.</p>
        </div>
        <button class="manage-add-btn" data-action="library-add-section">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Section</button>
        ${
          sections.length
            ? `<div class="cat-grid" style="margin-top:14px">${sections.map((section, i) => categoryCard(section, i)).join("")}</div>`
            : `<div class="placeholder-wrap reveal" style="animation-delay:60ms">
                 <span class="placeholder-icon hue-teal">${icon("library", { size: 28, strokeWidth: 2 })}</span>
                 <p class="placeholder-title">${MP.dom.escapeHtml(space.name)} is empty</p>
                 <p class="placeholder-text">Start by adding a section above.</p>
               </div>`
        }
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderSection(sectionId) {
    const section = findSection(sectionId);
    if (!section) return renderNotFound();
    const stats = sectionStats(section);
    return `
      <div class="page" data-page="library-section" data-route-key="/library/${sectionId}" data-section-id="${sectionId}">
        ${pageHeaderBack(section.title, ["Library"])}
        ${progressSummary({ done: stats.done, total: stats.total, hue: section.hue, label: "Overall section progress" })}
        <button class="manage-add-btn" data-action="library-add-subsection" data-section="${sectionId}">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Subsection</button>
        <div class="cat-grid" style="margin-top:14px">
          ${section.subsections.map((sub, i) => subsectionCard(sub, section.hue, i, sectionId)).join("") || `<p class="placeholder-text">No subsections yet.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderLessons(sectionId, subsectionId) {
    const found = findSubsection(sectionId, subsectionId);
    if (!found) return renderNotFound();
    const { section, subsection } = found;
    const stats = subsectionStats(subsection);
    return `
      <div class="page" data-page="library-lessons" data-route-key="/library/${sectionId}/${subsectionId}" data-section-id="${sectionId}" data-subsection-id="${subsectionId}">
        ${pageHeaderBack(subsection.title, ["Library", section.title])}
        ${progressSummary({ done: stats.done, total: stats.total, hue: subsection.hue, label: "Progress summary" })}
        <button class="manage-add-btn" data-action="library-add-lesson" data-section="${sectionId}" data-subsection="${subsectionId}">${icon("more", { size: 15, strokeWidth: 2.4 })}Add Lesson</button>
        <div class="lesson-list" style="margin-top:14px">
          ${subsection.lessons.map((lesson, i) => lessonCard(lesson, subsection.hue, i)).join("") || `<p class="placeholder-text">No lessons yet.</p>`}
        </div>
        <div class="bottom-spacer"></div>
      </div>`;
  }

  function renderNotFound() {
    return `
      <div class="page" data-page="library-missing">
        ${pageHeaderBack("Not found", ["Library"])}
        <p class="placeholder-text">That section doesn't exist yet.</p>
      </div>`;
  }

  function render(params = {}) {
    if (params.subsectionId) return renderLessons(params.sectionId, params.subsectionId);
    if (params.sectionId) return renderSection(params.sectionId);
    return renderRoot();
  }

  /* --------------------------- add-content forms --------------------------
     Deliberately tiny, name-only forms — same shape as Manage Library's,
     duplicated here (not imported) since pages/manage.js keeps its own
     copies as local closures. Both call the exact same MP.data CRUD, so
     there is still only ONE data system and ONE source of truth; this is
     just a second, equally-thin UI entry point onto it. */

  function sectionFormHtml() {
    return `
      <h2 class="sheet-title">Add Section</h2>
      <div class="sheet-field">
        <label class="sheet-label">Section name</label>
        <input class="sheet-input" data-field="title" placeholder="e.g. Internal Medicine" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Create Section</button>
      </div>`;
  }

  function subsectionFormHtml() {
    return `
      <h2 class="sheet-title">Add Subsection</h2>
      <div class="sheet-field">
        <label class="sheet-label">Subsection name</label>
        <input class="sheet-input" data-field="title" placeholder="e.g. Cardiology" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Create Subsection</button>
      </div>`;
  }

  function lessonFormHtml() {
    return `
      <h2 class="sheet-title">Add Lesson</h2>
      <div class="sheet-field">
        <label class="sheet-label">Lesson name</label>
        <input class="sheet-input" data-field="title" placeholder="e.g. Heart Failure" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-close>Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Create Lesson</button>
      </div>`;
  }

  function afterRender(root, params = {}) {
    animateProgress(root);

    // Same in-place-replace pattern as pages/manage.js's rerender(): a
    // brand-new page element gets a brand-new afterRender binding, so the
    // old node (and its listeners) is simply discarded — no accumulation.
    function rerender() {
      const scrollBox = document.getElementById("page-container");
      const savedScroll = scrollBox ? scrollBox.scrollTop : 0;
      const parent = root.parentNode;
      if (!parent) return;
      root.outerHTML = render(params);
      const freshRoot = qs(".page", parent);
      if (freshRoot) afterRender(freshRoot, params);
      if (scrollBox) scrollBox.scrollTop = savedScroll;
    }

    on(root, "click", '[data-action="go-back"]', () => MP.router.back());
    on(root, "click", '[data-action="open-category"]', (_e, target) => {
      MP.router.push(`/library/${target.dataset.category}`);
    });
    on(root, "click", '[data-action="open-subsection"]', (_e, target) => {
      MP.router.push(`/library/${target.dataset.section}/${target.dataset.subsection}`);
    });
    on(root, "click", '[data-action="open-lesson"]', (_e, target) => {
      MP.router.push(`/lesson/${target.dataset.lesson}`);
    });

    // Row-level mark-as-complete (circular button on each lesson card).
    // Same MP.state.toggleCompleted the Lesson screen uses; updates just
    // this row in place — icon, badge, and the sibling Lesson-screen-style
    // state stay consistent without a full re-render.
    on(root, "click", '[data-action="toggle-row-complete"]', (_e, target) => {
      const found = MP.data.findLesson(target.dataset.lesson);
      if (!found) return;
      const next = MP.state.toggleCompleted(found.lesson.id, found.lesson.completed);
      target.classList.toggle("is-done", next);
      const card = target.closest(".lesson-card");
      if (card) {
        const badge = qs(".badge", card);
        if (badge) badge.outerHTML = MP.dom.statusBadge(next);
        const openIcon = qs(".lesson-icon", card);
        if (openIcon) {
          const { icon } = MP.icons;
          openIcon.innerHTML = icon(next ? "checkCircle" : "fileText", { size: 17, strokeWidth: 2.1 });
        }
      }
      MP.toast && MP.toast.show(next ? "Marked as complete" : "Marked as not started", next ? "teal" : "coral");
    });

    on(root, "click", '[data-action="library-add-section"]', () => {
      MP.sheet.open(sectionFormHtml(), {
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

    on(root, "click", '[data-action="library-add-subsection"]', (_e, target) => {
      const sectionId = target.dataset.section;
      MP.sheet.open(subsectionFormHtml(), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.addSubsection(sectionId, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Subsection created", "teal");
          rerender();
        },
      });
    });

    on(root, "click", '[data-action="library-add-lesson"]', (_e, target) => {
      const { section, subsection } = target.dataset;
      MP.sheet.open(lessonFormHtml(), {
        submit: (c) => {
          const title = qs('[data-field="title"]', c).value;
          const result = MP.data.addLesson(section, subsection, { title });
          if (!result.ok) return MP.sheet.setError(result.error);
          MP.sheet.close();
          MP.toast && MP.toast.show("Lesson created", "teal");
          rerender();
        },
      });
    });
  }

  MP.pages = MP.pages || {};
  MP.pages.library = { render, afterRender };
})(window.MP = window.MP || {});
