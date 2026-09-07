/* ==========================================================================
   Components: Management cards
   Reuse existing .cat-card / .card / .stat-* classes rather than inventing
   a new visual language — only the small action-row and stat-card wrapper
   below are new (additive) CSS.
   ========================================================================== */

(function (MP) {
  const { icon } = MP.icons;

  function statsCard({ sections, subsections, lessons }) {
    return `
      <div class="manage-stats-card card reveal" style="animation-delay:40ms">
        <div><p class="stat-num">${sections}</p><p class="stat-label">Sections</p></div>
        <div class="stat-divider"></div>
        <div><p class="stat-num">${subsections}</p><p class="stat-label">Subsections</p></div>
        <div class="stat-divider"></div>
        <div><p class="stat-num">${lessons}</p><p class="stat-label">Lessons</p></div>
      </div>`;
  }

  function pluralize(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  /* Subsection icons that actually say what the subsection is about.
     Matched by keyword against the title (case-insensitive), most
     specific first; anything unmatched falls back to the generic library
     icon. Purely presentational — reads titles, never writes them. */
  const SUB_ICON_RULES = [
    [/neonat|incubator/i, "incubator"],
    [/child development/i, "babyFace"],
    [/urogynaecolog|prolapse|menopause/i, "female"],
    [/gyn[aæ]ecolog|oncology.*surgery/i, "female"],
    [/menstrual|puberty|hormon/i, "hormone"],
    [/vaginal bleeding/i, "drop"],
    [/contraception|infertility|preconception/i, "pill"],
    [/labou?r|birth/i, "pregnant"],
    [/obstetric emergen/i, "pregnant"],
    [/puerperium/i, "babyFace"],
    [/pulmonolog|respiratory/i, "lungs"],
    [/gastro|intestinal/i, "gut"],
    [/hepat|liver/i, "liver"],
    [/nephr|renal|kidney/i, "kidney"],
    [/endocrin|growth/i, "hormone"],
    [/rheumat|musculoskeletal|orthoped/i, "crutch"],
    [/hemat|blood/i, "blood"],
    [/infectious|inherited/i, "bug"],
    [/neuro/i, "nerve"],
    [/dermat|skin/i, "skin"],
    [/pharmacolog/i, "pill"],
    [/law|ethic|epidemiolog|public health/i, "scales"],
    [/critical care|intensive|anesthesia/i, "monitor"],
    [/cardiothoracic|vascular/i, "heartPulse"],
    [/ear, nose|head and neck/i, "ear"],
    [/ophthalmolog/i, "eye"],
    [/principles of surgery|trauma/i, "scissors"],
    [/congenital/i, "dna"],
    [/neurodevelopmental/i, "brain"],
    [/personality/i, "shield"],
    [/trauma- and stressor/i, "shield"],
  ];

  function subIcon(title) {
    for (const [re, name] of SUB_ICON_RULES) if (re.test(title)) return name;
    return "library";
  }

  function sectionManageCard(section, index = 0) {
    const subCount = section.subsections.length;
    const lessonCount = section.subsections.reduce((n, s) => n + s.lessons.length, 0);
    return `
      <div class="cat-card card card-press reveal" style="animation-delay:${60 + index * 55}ms">
        <div class="cat-top">
          <span class="cat-icon hue-${section.hue}">${icon(section.icon, { size: 18, strokeWidth: 2.2 })}</span>
        </div>
        <div class="cat-body">
          <h3 class="cat-title">${section.title}</h3>
          <p class="cat-desc">${pluralize(subCount, "subsection")} · ${pluralize(lessonCount, "lesson")}</p>
        </div>
        <div class="manage-actions">
          <button class="manage-action-btn manage-action-primary" data-action="manage-open-section" data-section="${section.id}">Open</button>
          <button class="manage-action-btn" data-action="manage-edit-section" data-section="${section.id}">Edit</button>
          <button class="manage-action-btn manage-action-danger" data-action="manage-delete-section" data-section="${section.id}">Delete</button>
        </div>
      </div>`;
  }

  function subsectionManageCard(subsection, sectionId, index = 0) {
    return `
      <div class="cat-card card card-press reveal" style="animation-delay:${60 + index * 55}ms">
        <div class="cat-top">
          <span class="cat-icon hue-${subsection.hue}">${icon(subIcon(subsection.title), { size: 17, strokeWidth: 2.1 })}</span>
        </div>
        <div class="cat-body">
          <h3 class="cat-title">${subsection.title}</h3>
          <p class="cat-desc">${pluralize(subsection.lessons.length, "lesson")}</p>
        </div>
        <div class="manage-actions">
          <button class="manage-action-btn manage-action-primary" data-action="manage-open-subsection" data-section="${sectionId}" data-subsection="${subsection.id}">Open</button>
          <button class="manage-action-btn" data-action="manage-edit-subsection" data-section="${sectionId}" data-subsection="${subsection.id}">Edit</button>
          <button class="manage-action-btn manage-action-danger" data-action="manage-delete-subsection" data-section="${sectionId}" data-subsection="${subsection.id}">Delete</button>
        </div>
      </div>`;
  }

  function lessonManageRow(lesson, index = 0) {
    const done = MP.data.isCompleted(lesson);
    const resourceCount = MP.data.countResources(lesson);
    return `
      <div class="lesson-card card card-press reveal lesson-card-with-toggle" style="animation-delay:${60 + index * 45}ms; align-items:flex-start">
        <button class="row-complete-btn ${done ? "is-done" : ""}" data-action="toggle-row-complete"
          data-lesson="${lesson.id}" aria-label="${done ? "Mark as not started" : "Mark as complete"}"
          title="${done ? "Completed" : "Mark as complete"}">
          <span class="complete-icon">${icon("checkCircle", { size: 20, strokeWidth: 2.3 })}</span>
        </button>
        <span class="lesson-body">
          <span class="lesson-title">${lesson.title}</span>
          <span class="lesson-meta-row">
            ${MP.dom.statusBadge(done)}
            <span class="lesson-resource-count">${resourceCount} resource${resourceCount === 1 ? "" : "s"}</span>
          </span>
          <div class="manage-actions" style="margin-top:10px">
            <button class="manage-action-btn manage-action-primary" data-action="manage-lesson-resources" data-lesson="${lesson.id}">Resources</button>
            <button class="manage-action-btn" data-action="manage-edit-lesson" data-lesson="${lesson.id}">Edit</button>
            <button class="manage-action-btn manage-action-danger" data-action="manage-delete-lesson" data-lesson="${lesson.id}">Delete</button>
          </div>
        </span>
      </div>`;
  }

  MP.components = MP.components || {};
  MP.components.management = { statsCard, sectionManageCard, subsectionManageCard, lessonManageRow, subIcon };
})(window.MP = window.MP || {});
