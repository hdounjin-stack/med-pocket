/* ==========================================================================
   Component: Resource Card (Lesson screen)
   Every card is tappable — a placeholder toast stands in for the real
   resource viewer / PDF reader / notes editor that will land later.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { statusBadge } = MP.dom;

  function resourceCard({ label, iconName, hue, body, index = 0, kind, toastMessage }) {
    return `
      <div class="resource-card card card-press reveal" style="animation-delay:${60 + index * 55}ms"
        role="button" tabindex="0" data-action="resource-tap" data-kind="${kind}" data-toast="${toastMessage}">
        <div class="resource-head">
          <span class="resource-icon hue-${hue}">${icon(iconName, { size: 15, strokeWidth: 2.2 })}</span>
          <span class="resource-label">${label}</span>
        </div>
        ${body}
      </div>`;
  }

  function openRow(name) {
    return `
      <div class="resource-item-row">
        <span class="resource-item-name">${name}</span>
        <span class="resource-open">Open ${icon("arrowUpRight", { size: 13, strokeWidth: 2.4 })}</span>
      </div>`;
  }

  function noteBody(text) {
    return `<p class="resource-note">${text}</p>`;
  }

  function statusBody(completed) {
    return statusBadge(completed);
  }

  MP.components = MP.components || {};
  MP.components.resourceCard = { resourceCard, openRow, noteBody, statusBody };
})(window.MP = window.MP || {});
