/* ==========================================================================
   Component: Link Viewer
   Renders the top bar (Back / source title / Open in Browser) and the
   embedded-page area for pages/linkViewer.js. Only http(s) URLs are ever
   handed to the iframe or to window.open — anything else is treated as
   invalid and never touches the DOM as a URL.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;

  const FRIENDLY_HOSTS = {
    "www.merckmanuals.com": "Merck Manual",
    "merckmanuals.com": "Merck Manual",
    "emedicine.medscape.com": "Medscape",
    "www.medscape.com": "Medscape",
    "www.msdmanuals.com": "MSD Manual",
    "msdmanuals.com": "MSD Manual",
    "teachmesurgery.com": "TeachMeSurgery",
    "teachmeobgyn.com": "TeachMeObGyn",
    "www.nhs.uk": "NHS",
    "www.mayoclinic.org": "Mayo Clinic",
    "www.cdc.gov": "CDC",
    "www.psychdb.com": "PsychDB",
    "psychdb.com": "PsychDB",
    "www.youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "www.amboss.com": "AMBOSS",
    "www.who.int": "WHO",
  };

  function isSafeUrl(url) {
    return typeof url === "string" && /^https?:\/\/[^\s]+$/i.test(url.trim());
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function friendlyLabel(entry) {
    if (entry && entry.title) return entry.title;
    const url = entry && entry.url;
    if (!isSafeUrl(url)) return "Link";
    try {
      const host = new URL(url).hostname;
      return FRIENDLY_HOSTS[host] || host.replace(/^www\./, "");
    } catch (e) {
      return "Link";
    }
  }

  function topbarHtml(title) {
    return `
      <div class="viewer-topbar">
        <button class="back-btn" data-action="go-back">${icon("chevronLeft", { size: 16, strokeWidth: 2.6 })}Back</button>
        <span class="viewer-title">${title}</span>
        <button class="viewer-open-external" data-action="viewer-open-external" aria-label="Open in Browser">
          Open ${icon("arrowUpRight", { size: 13, strokeWidth: 2.6 })}
        </button>
      </div>`;
  }

  function invalidStateHtml() {
    return `
      <div class="placeholder-wrap">
        <span class="placeholder-icon hue-coral">${icon("x", { size: 26, strokeWidth: 2.2 })}</span>
        <p class="placeholder-title">This link can't be opened</p>
        <p class="placeholder-text">The stored resource isn't a valid web address.</p>
      </div>`;
  }

  function blockedStateHtml() {
    return `
      <div class="placeholder-wrap" data-viewer-blocked>
        <span class="placeholder-icon hue-amber">${icon("inbox", { size: 26, strokeWidth: 2.2 })}</span>
        <p class="placeholder-title">Can't display this page inside MedPocket</p>
        <p class="placeholder-text">This site doesn't allow embedded viewing.</p>
        <button class="sheet-btn sheet-btn-primary" style="margin-top:14px" data-action="viewer-open-external">
          Open in Browser ${icon("arrowUpRight", { size: 13, strokeWidth: 2.6 })}
        </button>
      </div>`;
  }

  function frameHtml() {
    return `
      <div class="viewer-frame-wrap" data-viewer-frame-wrap>
        <div class="viewer-loading" data-viewer-loading>
          <div class="skeleton" style="width:60%;height:14px;border-radius:6px;margin:0 auto 10px"></div>
          <div class="skeleton" style="width:40%;height:12px;border-radius:6px;margin:0 auto"></div>
        </div>
        <iframe class="viewer-iframe" data-viewer-iframe title="External resource"
          referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.linkViewer = { isSafeUrl, hostOf, friendlyLabel, topbarHtml, invalidStateHtml, blockedStateHtml, frameHtml };
})(window.MP = window.MP || {});
