/* ==========================================================================
   MedPocket — Data Layer (single source of truth)

   Phase 6 hierarchy: study spaces → sections → subsections → lessons →
   resources. This is still ONE data system — STUDY_SPACES is the only
   top-level array; every existing section/subsection/lesson function below
   was rewritten to operate on getCurrentSpace().sections instead of a
   flat module-level SECTIONS array, but their signatures and behavior are
   otherwise unchanged from before this phase. Progress numbers are still
   never stored statically — always derived live from completion state,
   which is itself namespaced per space in js/state.js.

   MIGRATION NOTE: the exact section/subsection/lesson data that used to
   live in a flat SECTIONS array is now nested, byte-for-byte unchanged
   (same ids, same resources, same `completed` defaults), inside a single
   initial study space with id "emle" / name "EMLE". No ids were
   regenerated, nothing was deleted, nothing was duplicated.
   ========================================================================== */

(function (MP) {
  const HUES = ["teal", "coral", "violet", "rose", "indigo", "amber"];

  function emptyResources() {
    return { links: [], pdfs: [], notes: "" };
  }

  /* ------------------------- study spaces (top level) ------------------------- */

  const STUDY_SPACES = [
    {
      id: "emle",
      name: "EMLE",
      archived: false,
      recentlyOpened: ["ecg", "hypertension", "stroke", "asthma"],
      continueStudyingId: "ecg",
      sections: MP.emleContent,
    },
  ];

  function findStudySpace(spaceId) {
    return STUDY_SPACES.find((s) => s.id === spaceId) || null;
  }
  function getCurrentSpace() {
    const id = MP.state.getCurrentStudySpaceId();
    return findStudySpace(id) || STUDY_SPACES.find((s) => !s.archived) || STUDY_SPACES[0];
  }
  function currentSections() {
    return getCurrentSpace().sections;
  }
  function listActiveSpaces() {
    return STUDY_SPACES.filter((s) => !s.archived);
  }
  function listArchivedSpaces() {
    return STUDY_SPACES.filter((s) => s.archived);
  }
  function addStudySpace({ name }) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return { ok: false, error: "Study space name is required." };
    const id = MP.dom.uniqueId(MP.dom.slugify(trimmed), STUDY_SPACES.map((s) => s.id));
    const space = { id, name: trimmed, archived: false, recentlyOpened: [], continueStudyingId: null, sections: [] };
    STUDY_SPACES.push(space);
    return { ok: true, space };
  }
  function switchStudySpace(spaceId) {
    const space = findStudySpace(spaceId);
    if (!space || space.archived) return { ok: false, error: "Study space not found." };
    MP.state.setCurrentStudySpaceId(spaceId);
    return { ok: true, space };
  }
  function archiveStudySpace(spaceId) {
    const space = findStudySpace(spaceId);
    if (!space) return { ok: false, error: "Study space not found." };
    if (spaceId === MP.state.getCurrentStudySpaceId()) {
      return { ok: false, error: "Switch to another Study Space before archiving this one." };
    }
    space.archived = true;
    return { ok: true };
  }
  function restoreStudySpace(spaceId) {
    const space = findStudySpace(spaceId);
    if (!space) return { ok: false, error: "Study space not found." };
    space.archived = false;
    return { ok: true };
  }

  /* --------------------- lookups (scoped to the current space) --------------------- */

  function findSection(sectionId) {
    return currentSections().find((s) => s.id === sectionId) || null;
  }
  function findSubsection(sectionId, subsectionId) {
    const section = findSection(sectionId);
    if (!section) return null;
    const subsection = section.subsections.find((s) => s.id === subsectionId) || null;
    return subsection ? { section, subsection } : null;
  }
  function findLesson(lessonId) {
    for (const section of currentSections()) {
      for (const subsection of section.subsections) {
        const lesson = subsection.lessons.find((l) => l.id === lessonId);
        if (lesson) return { section, subsection, lesson };
      }
    }
    return null;
  }
  function allLessonsFlat() {
    const out = [];
    for (const section of currentSections()) {
      for (const subsection of section.subsections) {
        for (const lesson of subsection.lessons) {
          out.push({ section, subsection, lesson });
        }
      }
    }
    return out;
  }

  /* --------------------------- live progress ---------------------------
     Never cached: every call reads current completion state (itself
     namespaced per space), so switching spaces, completing a lesson, or
     adding/removing one always shows accurate, isolated numbers. */

  function isCompleted(lesson) {
    return MP.state.isCompleted(lesson.id, lesson.completed);
  }
  function subsectionStats(subsection) {
    const total = subsection.lessons.length;
    const done = subsection.lessons.filter(isCompleted).length;
    return { done, total };
  }
  function sectionStats(section) {
    return section.subsections.reduce(
      (acc, sub) => {
        const s = subsectionStats(sub);
        acc.done += s.done;
        acc.total += s.total;
        return acc;
      },
      { done: 0, total: 0 }
    );
  }
  function overallStats() {
    return currentSections().reduce(
      (acc, section) => {
        const s = sectionStats(section);
        acc.done += s.done;
        acc.total += s.total;
        return acc;
      },
      { done: 0, total: 0 }
    );
  }
  function countResources(lesson) {
    const r = (lesson && lesson.resources) || {};
    const links = Array.isArray(r.links) ? r.links.length : 0;
    const pdfs = Array.isArray(r.pdfs) ? r.pdfs.length : 0;
    const notes = r.notes && String(r.notes).trim() ? 1 : 0;
    return links + pdfs + notes;
  }
  function linkLabel(url) {
    try {
      const u = new URL(url);
      const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
      return (u.hostname + path).replace(/\/$/, "");
    } catch (e) {
      return url;
    }
  }
  function totalSectionsCount() {
    return currentSections().length;
  }
  function totalSubsectionsCount() {
    return currentSections().reduce((n, s) => n + s.subsections.length, 0);
  }
  function totalLessonsCount() {
    return currentSections().reduce((n, s) => n + s.subsections.reduce((m, su) => m + su.lessons.length, 0), 0);
  }

  /* ------------------------------ CRUD ---------------------------------
     Every mutator returns { ok, error?, <entity>? } and operates on the
     CURRENT study space's own sections array — nothing here can leak into
     another space, because currentSections() always resolves through
     MP.state.getCurrentStudySpaceId(). */

  function addSection({ title }) {
    const name = String(title || "").trim();
    if (!name) return { ok: false, error: "Section name is required." };
    const sections = currentSections();
    const id = MP.dom.uniqueId(MP.dom.slugify(name), sections.map((s) => s.id));
    const hue = HUES[sections.length % HUES.length];
    const section = { id, title: name, desc: "", icon: "library", hue, subsections: [] };
    sections.push(section);
    return { ok: true, section };
  }
  function updateSection(sectionId, { title } = {}) {
    const section = findSection(sectionId);
    if (!section) return { ok: false, error: "Section not found." };
    if (title !== undefined) {
      const name = String(title).trim();
      if (!name) return { ok: false, error: "Section name is required." };
      section.title = name; // id is never changed on rename
    }
    return { ok: true, section };
  }
  function deleteSection(sectionId) {
    const sections = currentSections();
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return { ok: false, error: "Section not found." };
    const [removed] = sections.splice(index, 1);
    removed.subsections.forEach((sub) => sub.lessons.forEach((l) => MP.state.removeCompleted(l.id)));
    return { ok: true };
  }

  function addSubsection(sectionId, { title }) {
    const section = findSection(sectionId);
    if (!section) return { ok: false, error: "Section not found." };
    const name = String(title || "").trim();
    if (!name) return { ok: false, error: "Subsection name is required." };
    const id = MP.dom.uniqueId(MP.dom.slugify(name), section.subsections.map((s) => s.id));
    const subsection = { id, title: name, desc: "", hue: section.hue, lessons: [] };
    section.subsections.push(subsection);
    return { ok: true, subsection };
  }
  function updateSubsection(sectionId, subsectionId, { title } = {}) {
    const found = findSubsection(sectionId, subsectionId);
    if (!found) return { ok: false, error: "Subsection not found." };
    if (title !== undefined) {
      const name = String(title).trim();
      if (!name) return { ok: false, error: "Subsection name is required." };
      found.subsection.title = name; // id is never changed on rename
    }
    return { ok: true, subsection: found.subsection };
  }
  function deleteSubsection(sectionId, subsectionId) {
    const section = findSection(sectionId);
    if (!section) return { ok: false, error: "Section not found." };
    const index = section.subsections.findIndex((s) => s.id === subsectionId);
    if (index === -1) return { ok: false, error: "Subsection not found." };
    const [removed] = section.subsections.splice(index, 1);
    removed.lessons.forEach((l) => MP.state.removeCompleted(l.id));
    return { ok: true };
  }

  function addLesson(sectionId, subsectionId, { title }) {
    const found = findSubsection(sectionId, subsectionId);
    if (!found) return { ok: false, error: "Subsection not found." };
    const name = String(title || "").trim();
    if (!name) return { ok: false, error: "Lesson name is required." };
    const id = MP.dom.uniqueId(MP.dom.slugify(name), allLessonsFlat().map((x) => x.lesson.id));
    const lesson = { id, title: name, description: "", completed: false, resources: emptyResources() };
    found.subsection.lessons.push(lesson);
    return { ok: true, lesson };
  }
  function updateLesson(lessonId, patch = {}) {
    const found = findLesson(lessonId);
    if (!found) return { ok: false, error: "Lesson not found." };
    const { lesson } = found;
    if (patch.title !== undefined) {
      const name = String(patch.title).trim();
      if (!name) return { ok: false, error: "Lesson name is required." };
      lesson.title = name; // id is never changed on rename — completion stays linked
    }
    if (patch.description !== undefined) lesson.description = String(patch.description || "").trim();
    if (patch.resources) {
      lesson.resources = lesson.resources || emptyResources();
      if (patch.resources.links !== undefined) lesson.resources.links = patch.resources.links;
      if (patch.resources.pdfs !== undefined) lesson.resources.pdfs = patch.resources.pdfs;
      if (patch.resources.notes !== undefined) lesson.resources.notes = patch.resources.notes;
    }
    return { ok: true, lesson };
  }
  function deleteLesson(lessonId) {
    const found = findLesson(lessonId);
    if (!found) return { ok: false, error: "Lesson not found." };
    const { subsection, lesson } = found;
    const index = subsection.lessons.findIndex((l) => l.id === lessonId);
    subsection.lessons.splice(index, 1);
    MP.state.removeCompleted(lesson.id); // no orphaned completion entries left behind
    return { ok: true };
  }

  MP.data = {
    STUDY_SPACES,
    HUES,
    findStudySpace,
    getCurrentSpace,
    currentSections,
    listActiveSpaces,
    listArchivedSpaces,
    addStudySpace,
    switchStudySpace,
    archiveStudySpace,
    restoreStudySpace,
    findSection,
    findSubsection,
    findLesson,
    allLessonsFlat,
    isCompleted,
    subsectionStats,
    sectionStats,
    overallStats,
    countResources,
    linkLabel,
    totalSectionsCount,
    totalSubsectionsCount,
    totalLessonsCount,
    addSection,
    updateSection,
    deleteSection,
    addSubsection,
    updateSubsection,
    deleteSubsection,
    addLesson,
    updateLesson,
    deleteLesson,
  };
})(window.MP = window.MP || {});
