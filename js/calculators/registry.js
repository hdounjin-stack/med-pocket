/* ==========================================================================
   Calculator registry
   The Calculators list page and the Calculator detail page are both driven
   entirely off this registry — adding a future calculator means adding a
   definition object (see js/calculators/egfr.js for the shape) and calling
   register(), not building a new page or UI.
   ========================================================================== */

(function (MP) {
  const list = [];

  // Fixed display order/labels for categories. Only categories that end up
  // with >=1 registered calculator are ever shown (see groupedByCategory).
  const CATEGORIES = [
    { id: "emergency", label: "Emergency", icon: "flame" },
    { id: "cardiology", label: "Cardiology", icon: "heart" },
    { id: "renal", label: "Renal", icon: "flask" },
    { id: "pediatrics", label: "Pediatrics", icon: "baby" },
    { id: "general", label: "General", icon: "calculator" },
    { id: "drug-dose", label: "Drug Dose", icon: "checkCircle" },
    { id: "electrolytes-acid-base", label: "Electrolytes & Acid-Base", icon: "flask" },
    { id: "respiratory", label: "Respiratory", icon: "stethoscope" },
    { id: "thromboembolism", label: "Thromboembolism", icon: "heartPulse" },
  ];

  function register(definition) {
    list.push(definition);
  }
  function all() {
    return list;
  }
  function get(id) {
    return list.find((c) => c.id === id) || null;
  }
  // Local to the Calculators section only — never touches the global
  // lesson search (see components/searchOverlay.js, which is unrelated).
  function search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.category && categoryLabel(c.category).toLowerCase().includes(q)) ||
        (c.shortDescription && c.shortDescription.toLowerCase().includes(q))
    );
  }
  function categoryLabel(categoryId) {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat ? cat.label : categoryId;
  }
  // Preserves CATEGORIES order, then registry order within each category.
  // Categories with zero calculators are omitted entirely.
  function groupedByCategory() {
    return CATEGORIES.map((cat) => ({
      ...cat,
      calculators: list.filter((c) => c.category === cat.id),
    })).filter((cat) => cat.calculators.length > 0);
  }

  MP.calculators = MP.calculators || {};
  MP.calculators.registry = { register, all, get, search, categoryLabel, groupedByCategory, CATEGORIES };
})(window.MP = window.MP || {});
