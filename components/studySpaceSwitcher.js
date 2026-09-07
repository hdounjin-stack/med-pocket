/* ==========================================================================
   Component: Study Space Switcher
   Everything here runs through the SAME global MP.sheet singleton every
   other management sheet uses (see components/sheet.js + js/main.js) —
   no second sheet instance, no new route. Reachable from the header's
   eyebrow switcher on every page (wired once in js/main.js), matching the
   "state-driven, not a new navigation system" requirement.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { qs, escapeHtml } = MP.dom;

  function spaceRowHtml(space, isCurrent) {
    return `
      <div class="resource-row" style="align-items:center">
        <button class="resource-row-text" style="text-align:left;background:none;flex:1;padding:6px 0"
          data-sheet-action="switch-space" data-space="${space.id}">
          ${isCurrent ? "✓ " : ""}${escapeHtml(space.name)}${isCurrent ? " · current" : ""}
        </button>
        ${
          isCurrent
            ? ""
            : `<button class="row-delete-btn" style="width:auto;padding:0 12px;font-size:11px;font-weight:700;background:var(--surface-solid);color:var(--text-tertiary);border:1px solid var(--border)"
                 data-sheet-action="archive-space" data-space="${space.id}">Archive</button>`
        }
      </div>`;
  }

  function archivedRowHtml(space) {
    return `
      <div class="resource-row" style="align-items:center">
        <span class="resource-row-text" style="padding:6px 0">${escapeHtml(space.name)}</span>
        <button class="row-delete-btn" style="width:auto;padding:0 12px;font-size:11px;font-weight:700;background:var(--accent-soft);color:var(--accent-strong)"
          data-sheet-action="restore-space" data-space="${space.id}">Restore</button>
      </div>`;
  }

  function switcherHtml() {
    const currentId = MP.state.getCurrentStudySpaceId();
    const active = MP.data.listActiveSpaces();
    const archived = MP.data.listArchivedSpaces();
    return `
      <h2 class="sheet-title">Study Spaces</h2>
      <div data-space-list>
        ${active.map((s) => spaceRowHtml(s, s.id === currentId)).join("")}
      </div>
      <button class="sheet-add-row-btn" data-sheet-action="open-create-space">${icon("more", { size: 13, strokeWidth: 2.6 })} Create Study Space</button>
      ${
        archived.length
          ? `<p class="sheet-heading-inline">Archived</p>
             <div data-archived-list>${archived.map(archivedRowHtml).join("")}</div>`
          : ""
      }
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Done</button>
      </div>`;
  }

  function createSpaceHtml() {
    return `
      <h2 class="sheet-title">Create Study Space</h2>
      <div class="sheet-field">
        <label class="sheet-label">Name</label>
        <input class="sheet-input" data-field="name" placeholder="e.g. MRCS" />
      </div>
      <p class="sheet-error" data-sheet-error></p>
      <div class="sheet-actions">
        <button class="sheet-btn sheet-btn-cancel" data-sheet-action="back-to-switcher">Cancel</button>
        <button class="sheet-btn sheet-btn-primary" data-sheet-submit>Create</button>
      </div>`;
  }

  function openSwitcher() {
    MP.sheet.open(switcherHtml(), {
      submit: () => MP.sheet.close(),
      action: (action, target) => {
        if (action === "open-create-space") return openCreateSpace();

        if (action === "switch-space") {
          const spaceId = target.dataset.space;
          if (spaceId === MP.state.getCurrentStudySpaceId()) return;
          const result = MP.data.switchStudySpace(spaceId);
          if (!result.ok) return;
          MP.sheet.close();
          MP.toast && MP.toast.show(`Switched to ${result.space.name}`, "teal");
          MP.router.replace("/home");
        }

        if (action === "archive-space") {
          const spaceId = target.dataset.space;
          const result = MP.data.archiveStudySpace(spaceId);
          if (!result.ok) {
            MP.sheet.setError(result.error);
            return;
          }
          MP.toast && MP.toast.show("Study space archived", "coral");
          openSwitcher(); // refresh the list in place
        }

        if (action === "restore-space") {
          const spaceId = target.dataset.space;
          const result = MP.data.restoreStudySpace(spaceId);
          if (!result.ok) {
            MP.sheet.setError(result.error);
            return;
          }
          MP.toast && MP.toast.show("Study space restored", "teal");
          openSwitcher(); // refresh the list in place
        }
      },
    });
  }

  function openCreateSpace() {
    MP.sheet.open(createSpaceHtml(), {
      submit: (c) => {
        const name = qs('[data-field="name"]', c).value;
        const result = MP.data.addStudySpace({ name });
        if (!result.ok) return MP.sheet.setError(result.error);
        MP.toast && MP.toast.show("Study space created", "teal");
        openSwitcher();
      },
      action: (action) => {
        if (action === "back-to-switcher") openSwitcher();
      },
    });
  }

  MP.studySpaceSwitcher = { open: openSwitcher };
})(window.MP = window.MP || {});
