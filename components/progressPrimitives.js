/* ==========================================================================
   Component: radial ring + linear bar
   Pure render helpers — the actual "grow" animation is triggered by
   toggling a data attribute after insertion (see animate()).
   ========================================================================== */

(function (MP) {
  function radialRing({ value, size = 36, stroke = 4 }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radial-ring" data-radial data-target="${value}" data-circumference="${c}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="radial-track" fill="none"></circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="radial-fill" fill="none"
          stroke-dasharray="${c}" stroke-dashoffset="${c}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
      </svg>`;
  }

  function bar({ value, hue = "teal" }) {
    return `
      <div class="bar-track">
        <div class="bar-fill hue-${hue}" data-bar data-target="${value}" style="width:0%"></div>
      </div>`;
  }

  // Call after the markup containing radial/bar elements is attached to the DOM.
  function animateProgress(root = document) {
    requestAnimationFrame(() => {
      MP.dom.qsa("[data-radial]", root).forEach((svg) => {
        const target = Number(svg.dataset.target);
        const c = Number(svg.dataset.circumference);
        const fill = svg.querySelector(".radial-fill");
        const offset = c - (target / 100) * c;
        requestAnimationFrame(() => {
          fill.style.strokeDashoffset = String(offset);
        });
      });
      MP.dom.qsa("[data-bar]", root).forEach((bar) => {
        const target = Number(bar.dataset.target);
        requestAnimationFrame(() => {
          bar.style.width = target + "%";
        });
      });
    });
  }

  MP.components = MP.components || {};
  MP.components.radialRing = radialRing;
  MP.components.bar = bar;
  MP.components.animateProgress = animateProgress;
})(window.MP = window.MP || {});
