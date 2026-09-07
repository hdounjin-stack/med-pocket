/* ==========================================================================
   Component: Overall Progress Card
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;
  const { radialRing, bar } = MP.components;

  function progressCard({ overallPct, streak, done, remaining, total }) {
    return `
      <section class="progress-card reveal" style="animation-delay:40ms">
        <svg class="ecg" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
          <path class="ecg-path" d="M0,32 L46,32 L58,32 L66,10 L76,52 L86,20 L96,32 L140,32 L152,32 L160,14 L170,48 L180,24 L190,32 L300,32" />
        </svg>
        <div class="progress-top">
          <div>
            <p class="progress-label">Overall progress</p>
            <div class="progress-value-row">
              <span class="progress-value">${overallPct}%</span>
              <span class="streak-pill">${icon("flame", { size: 13, strokeWidth: 2.4, className: "streak-flame" })}${streak}-day streak</span>
            </div>
          </div>
          ${radialRing({ value: overallPct, size: 56, stroke: 5.5 })}
        </div>
        ${bar({ value: overallPct, hue: "teal" })}
        <div class="progress-stats">
          <div><p class="stat-num">${done}</p><p class="stat-label">Completed</p></div>
          <div class="stat-divider"></div>
          <div><p class="stat-num">${remaining}</p><p class="stat-label">Remaining</p></div>
          <div class="stat-divider"></div>
          <div><p class="stat-num">${total}</p><p class="stat-label">Total items</p></div>
        </div>
      </section>`;
  }

  function progressSummary({ done, total, hue = "teal", label = "Section progress" }) {
    const p = MP.dom.pct(done, total);
    return `
      <div class="section-progress card reveal" style="animation-delay:50ms">
        ${radialRing({ value: p, size: 52, stroke: 5 })}
        <div class="section-progress-body">
          <p class="section-progress-label">${label}</p>
          <p class="section-progress-value">${done} of ${total} lesson${total === 1 ? "" : "s"} completed</p>
          ${bar({ value: p, hue })}
        </div>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.progressCard = progressCard;
  MP.components.progressSummary = progressSummary;
})(window.MP = window.MP || {});
