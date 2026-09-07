/* ==========================================================================
   Page: Link Viewer (/link/:lessonId/:index)
   URL is never embedded in the route — only the lesson id + link index are.
   The actual URL is looked up from MP.data at render time, validated as
   http(s)-only, and assigned via the `src` PROPERTY (not innerHTML), so an
   untrusted stored string can never be interpreted as markup or script.
   ========================================================================== */

(function (MP) {
  const { isSafeUrl, friendlyLabel, topbarHtml, invalidStateHtml, blockedStateHtml, frameHtml } = MP.components.linkViewer;
  const { findLesson } = MP.data;
  const { on, qs } = MP.dom;

  const LOAD_TIMEOUT_MS = 6000;

  function resolveLink(params) {
    const found = findLesson(params.lessonId);
    if (!found) return null;
    const links = (found.lesson.resources && found.lesson.resources.links) || [];
    const entry = links[Number(params.index)];
    if (!entry) return null;
    return { lesson: found.lesson, entry };
  }

  function render(params = {}) {
    const resolved = resolveLink(params);
    const title = resolved ? friendlyLabel(resolved.entry) : "Link";
    const valid = resolved && isSafeUrl(resolved.entry.url);

    return `
      <div class="page" data-page="link-viewer">
        ${topbarHtml(title)}
        ${valid ? frameHtml() : invalidStateHtml()}
      </div>`;
  }

  function afterRender(root, params = {}) {
    const resolved = resolveLink(params);
    const url = resolved ? resolved.entry.url.trim() : null;
    const valid = url && isSafeUrl(url);

    on(root, "click", '[data-action="go-back"]', () => MP.router.back());
    on(root, "click", '[data-action="viewer-open-external"]', () => {
      if (valid) window.open(url, "_blank", "noopener,noreferrer");
    });

    if (!valid) return;

    const wrap = qs("[data-viewer-frame-wrap]", root);
    const loading = qs("[data-viewer-loading]", root);
    const iframe = qs("[data-viewer-iframe]", root);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      wrap.outerHTML = blockedStateHtml();
    }, LOAD_TIMEOUT_MS);

    iframe.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (loading) loading.style.display = "none";
    });

    // Assigned as a property, never interpolated into HTML.
    iframe.src = url;
  }

  MP.pages = MP.pages || {};
  MP.pages.linkViewer = { render, afterRender };
})(window.MP = window.MP || {});
