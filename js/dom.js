/* ==========================================================================
   MedPocket — DOM helpers
   ========================================================================== */

(function (MP) {
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }
  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }
  function on(el, event, selectorOrHandler, maybeHandler) {
    if (typeof selectorOrHandler === "function") {
      el.addEventListener(event, selectorOrHandler);
      return;
    }
    const selector = selectorOrHandler;
    const handler = maybeHandler;
    el.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target && el.contains(target)) handler(e, target);
    });
  }
  function el(tag, attrs = {}, html = "") {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (html) node.innerHTML = html;
    return node;
  }
  function statusBadge(completed) {
    return completed
      ? `<span class="badge badge-done"><span class="badge-dot"></span>Completed</span>`
      : `<span class="badge badge-todo"><span class="badge-dot"></span>Not Started</span>`;
  }
  function pct(done, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((done / total) * 100));
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function slugify(text) {
    return (
      String(text || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "item"
    );
  }
  function uniqueId(base, existingIds) {
    let id = base;
    let n = 2;
    while (existingIds.includes(id)) {
      id = `${base}-${n}`;
      n++;
    }
    return id;
  }

  MP.dom = { qs, qsa, on, el, statusBadge, pct, escapeHtml, slugify, uniqueId };
})(window.MP = window.MP || {});
