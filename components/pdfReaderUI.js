/* ==========================================================================
   Component: PDF Reader UI
   Pure HTML builders, no state — pages/pdfReader.js owns all behavior.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;

  function topbarHtml(title) {
    return `
      <div class="viewer-topbar">
        <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
        <span class="viewer-title">${title}</span>
        <button class="pdf-topbar-icon-btn" data-action="pdf-toggle-search" aria-label="Search PDF">
          ${icon("search", { size: 16, strokeWidth: 2.2 })}
        </button>
      </div>`;
  }

  function searchBarHtml() {
    return `
      <div class="pdf-search-bar" data-pdf-search-bar>
        <div class="search-field" style="margin:0; flex:1">
          ${icon("search", { size: 15, strokeWidth: 2.2, className: "icon" })}
          <input type="text" class="search-input" placeholder="Search this PDF…" data-pdf-search-input autocomplete="off" />
        </div>
        <span class="pdf-search-count" data-pdf-search-count></span>
        <button class="pdf-topbar-icon-btn" data-action="pdf-search-prev" aria-label="Previous match">${icon("chevronLeft", { size: 15, strokeWidth: 2.4 })}</button>
        <button class="pdf-topbar-icon-btn" data-action="pdf-search-next" aria-label="Next match">${icon("chevronRight", { size: 15, strokeWidth: 2.4 })}</button>
        <button class="pdf-topbar-icon-btn" data-action="pdf-toggle-search" aria-label="Close search">${icon("x", { size: 15, strokeWidth: 2.4 })}</button>
      </div>`;
  }

  function loadingHtml() {
    return `
      <div class="pdf-loading" data-pdf-loading>
        <div class="skeleton" style="width:70%;height:16px;border-radius:6px;margin:0 auto 12px"></div>
        <div class="skeleton" style="width:50%;height:12px;border-radius:6px;margin:0 auto 8px"></div>
        <div class="skeleton" style="width:60%;height:12px;border-radius:6px;margin:0 auto"></div>
      </div>`;
  }

  function errorHtml(message) {
    return `
      <div class="placeholder-wrap">
        <span class="placeholder-icon hue-coral">${icon("x", { size: 26, strokeWidth: 2.2 })}</span>
        <p class="placeholder-title">Unable to display this PDF</p>
        <p class="placeholder-text">${message || "The document couldn't be loaded."}</p>
        <button class="sheet-btn sheet-btn-primary" style="margin-top:14px" data-action="viewer-open-external">
          Open in Browser ${icon("arrowUpRight", { size: 13, strokeWidth: 2.6 })}
        </button>
      </div>`;
  }

  function bottomBarHtml() {
    return `
      <div class="pdf-bottom-bar">
        <button class="pdf-topbar-icon-btn" data-action="pdf-zoom-out" aria-label="Zoom out">−</button>
        <button class="pdf-page-indicator" data-action="pdf-jump" data-pdf-page-indicator>Page 1 / 1</button>
        <button class="pdf-topbar-icon-btn" data-action="pdf-toggle-bookmark" data-pdf-bookmark-btn aria-label="Bookmark this page">
          ${icon("checkCircle", { size: 16, strokeWidth: 2.2 })}
        </button>
        <button class="pdf-topbar-icon-btn" data-action="pdf-marks-list" aria-label="Bookmarks and notes">
          ${icon("menu", { size: 16, strokeWidth: 2.2 })}
        </button>
        <button class="pdf-topbar-icon-btn" data-action="pdf-zoom-in" aria-label="Zoom in">+</button>
      </div>`;
  }

  /* Selection popup: appears near the user's text selection inside the
     viewer. Offers highlight colors, copy, and note. Built fresh each time
     by pages/pdfReader.js — this is only its HTML shape. */
  function selectionPopupHtml() {
    return `
      <div class="pdf-sel-popup" data-pdf-sel-popup role="menu">
        <div class="pdf-sel-colors">
          <button class="pdf-sel-color is-yellow" data-action="pdf-highlight" data-color="yellow" aria-label="Highlight yellow"></button>
          <button class="pdf-sel-color is-green" data-action="pdf-highlight" data-color="green" aria-label="Highlight green"></button>
          <button class="pdf-sel-color is-pink" data-action="pdf-highlight" data-color="pink" aria-label="Highlight pink"></button>
        </div>
        <span class="pdf-sel-divider"></span>
        <button class="pdf-sel-act" data-action="pdf-copy-selection">Copy</button>
        <span class="pdf-sel-divider"></span>
        <button class="pdf-sel-act" data-action="pdf-note-from-selection">Note</button>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.pdfReaderUI = { topbarHtml, searchBarHtml, loadingHtml, errorHtml, bottomBarHtml, selectionPopupHtml };
})(window.MP = window.MP || {});
