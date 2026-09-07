/* ==========================================================================
   MedPocket — PDF Annotations Storage (MP.pdfMarks)

   Highlights, page bookmarks, and per-page notes for the PDF reader live
   in their OWN IndexedDB database — deliberately separate from both the
   lesson data tree (js/data/emle.js, in-memory by design) and the local
   file store (js/files.js). Same philosophy as js/files.js: records here
   SURVIVE reloads because they reference stable keys, never in-memory ids.

   Record shape:
     { id, docId, page, kind, text, note, rects, color, createdAt }
       docId  — stable document key: "u:<url>" for URL resources,
                "f:<fileId>" for local IndexedDB files (built by
                docKey() below; pdfReader.js passes the same value it
                resolves for the open document).
       page   — 1-based page number (matches PDF.js data-page-number)
       kind   — "highlight" | "bookmark" | "note"
       text   — quoted selection text (highlights/notes-from-selection)
       note   — free-text note body (notes only)
       rects  — highlight boxes as FRACTIONS of the page box
                ({l,t,w,h} each 0..1, 4dp) so overlays rescale perfectly
                with zoom/layout changes without recomputation.
       color  — highlight color key: "yellow"|"green"|"pink"

   API is promise-based like MP.files; every method is tiny and the whole
   module mirrors js/files.js's transaction style on purpose.
   ========================================================================== */

(function (MP) {
  const DB_NAME = "medpocket-annotations";
  const DB_VERSION = 1;
  const STORE = "marks";

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is not available in this browser."));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("docId", "docId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Could not open annotation storage."));
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Annotation storage request failed."));
    });
  }

  // Stable per-document key (see header). Normalizes trivially-different
  // URLs of the same resource (hash/trailing slash) so URL-PDF marks match
  // across sessions even if the entry URL was touched cosmetically.
  function docKey(kind, idOrUrl) {
    if (kind === "file") return "f:" + idOrUrl;
    let u = String(idOrUrl || "").split("#")[0];
    while (u.endsWith("/")) u = u.slice(0, -1);
    return "u:" + u;
  }

  // All marks for one document, oldest first (stable list order).
  function all(docId) {
    return tx("readonly").then(
      (store) =>
        new Promise((resolve, reject) => {
          const index = store.index("docId");
          const out = [];
          const cursorReq = index.openCursor(IDBKeyRange.only(docId));
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              out.push(cursor.value);
              cursor.continue();
            } else {
              out.sort((a, b) => a.createdAt - b.createdAt || a.page - b.page);
              resolve(out);
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error || new Error("Could not list annotations."));
        })
    );
  }

  function add({ docId, page, kind, text, note, rects, color }) {
    const record = {
      id: makeId(),
      docId,
      page: Math.max(1, Math.floor(Number(page) || 1)),
      kind, // "highlight" | "bookmark" | "note"
      text: typeof text === "string" ? text.slice(0, 4000) : "",
      note: typeof note === "string" ? note.slice(0, 4000) : "",
      rects: Array.isArray(rects) ? rects : null,
      color: color || "yellow",
      createdAt: Date.now(),
    };
    return tx("readwrite").then((store) => reqToPromise(store.add(record))).then(() => record);
  }

  function remove(id) {
    return tx("readwrite").then((store) => reqToPromise(store.delete(id)));
  }

  function update(id, patch) {
    return tx("readwrite").then(
      (store) =>
        new Promise((resolve, reject) => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const record = getReq.result;
            if (!record) return resolve(null);
            ["note", "color"].forEach((k) => {
              if (patch && patch[k] !== undefined) record[k] = patch[k];
            });
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve(record);
            putReq.onerror = () => reject(putReq.error || new Error("Could not update annotation."));
          };
          getReq.onerror = () => reject(getReq.error || new Error("Could not read annotation."));
        })
    );
  }

  MP.pdfMarks = { docKey, all, add, remove, update };
})(window.MP = window.MP || {});
