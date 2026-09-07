/* ==========================================================================
   Component: Sheet (global singleton)
   Used for every Add/Edit/Confirm/resource-management screen. Mounted
   exactly once on `shell` (see js/main.js) — NOT inside `.page` — because
   `.page` carries a transform-driven animation, and any element with a
   non-`none` transform becomes the containing block for `position:fixed`
   descendants, which broke the sheet's viewport positioning previously.
   That fix is preserved as-is in this phase; only the API surface grew.

   Phase 5 adds:
   - a generic `action` callback (for "+ Add Link", "🗑 remove row", tapping
     a resource-summary row, etc.) alongside the existing `submit` callback,
     dispatched via `[data-sheet-action]` on both click AND change events
     (the latter needed for the hidden PDF file-picker input) — still only
     TWO permanent delegated listeners total, bound once in mount(), so
     screen-to-screen navigation inside the sheet can never accumulate
     listeners no matter how many times a lesson's resources are opened.
   - a soft cross-fade when swapping content while already open (Manage
     Lesson -> Links -> back, etc.), so in-sheet navigation doesn't feel
     like an abrupt flicker, while the *first* open still uses the
     slide-up-from-bottom entrance as before.
   ========================================================================== */

(function (MP) {
  const { qs, on } = MP.dom;

  function mount(shell) {
    shell.insertAdjacentHTML(
      "beforeend",
      `<div class="sheet-overlay" data-sheet>
         <div class="sheet-overlay-backdrop" data-sheet-close></div>
         <div class="sheet-panel" data-sheet-panel>
           <div class="sheet-handle"></div>
           <div data-sheet-content></div>
         </div>
       </div>`
    );
    const overlay = qs("[data-sheet]", shell);
    const panel = qs("[data-sheet-panel]", overlay);
    const content = qs("[data-sheet-content]", overlay);
    const scrollBox = document.getElementById("page-container");

    let onSubmit = null;
    let onAction = null;
    let savedScrollTop = 0;

    // Bound exactly once, ever — never re-registered per page/per open().
    on(overlay, "click", "[data-sheet-close]", () => close());
    on(overlay, "click", "[data-sheet-submit]", () => {
      if (onSubmit) onSubmit(content);
    });
    on(overlay, "click", "[data-sheet-action]", (_e, t) => {
      if (onAction) onAction(t.dataset.sheetAction, t, content);
    });
    on(overlay, "change", "[data-sheet-action]", (_e, t) => {
      if (onAction) onAction(t.dataset.sheetAction, t, content);
    });

    function focusFirstField() {
      requestAnimationFrame(() => {
        const firstField = qs(".sheet-input, .sheet-textarea", content);
        if (firstField) firstField.focus({ preventScroll: true });
      });
    }

    function open(html, { submit, action } = {}) {
      onSubmit = typeof submit === "function" ? submit : null;
      onAction = typeof action === "function" ? action : null;

      const alreadyOpen = overlay.classList.contains("is-open");

      if (alreadyOpen) {
        // In-sheet navigation between screens (e.g. Manage Lesson -> Links):
        // cross-fade the content instead of an instant swap, so it never
        // reads as a flicker. The panel itself doesn't move.
        content.style.transition = "opacity 130ms ease";
        content.style.opacity = "0";
        setTimeout(() => {
          content.innerHTML = html;
          content.scrollTop = 0;
          requestAnimationFrame(() => {
            content.style.opacity = "1";
          });
          focusFirstField();
        }, 130);
        return;
      }

      content.innerHTML = html;
      content.style.opacity = "1";

      if (scrollBox) {
        savedScrollTop = scrollBox.scrollTop;
        scrollBox.style.overflow = "hidden";
      }
      overlay.classList.add("is-open");
      focusFirstField();
    }

    function close() {
      overlay.classList.remove("is-open");
      onSubmit = null;
      onAction = null;
      if (scrollBox) {
        scrollBox.style.overflow = "";
        scrollBox.scrollTop = savedScrollTop;
      }
    }
    function setError(message) {
      const err = qs("[data-sheet-error]", content);
      if (err) err.textContent = message;
    }

    return { open, close, setError, get content() { return content; } };
  }

  MP.components = MP.components || {};
  MP.components.sheet = { mount };
})(window.MP = window.MP || {});
