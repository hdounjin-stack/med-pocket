/* ==========================================================================
   MedPocket — Local File Storage (MP.files)

   Real device files (Word/PowerPoint/PDF/Other picked from the file
   system) are NEVER put into MP.data / STUDY_SPACES / js/data/emle.js —
   that tree is a plain in-memory JS object tree, unsuited for binary
   Blobs and (per the in-memory-only design of js/state.js) already
   doesn't survive a reload anyway.

   Instead this module owns one dedicated IndexedDB database with a
   single object store, keyed by a generated id, indexed by lessonId.
   Records are: { id, lessonId, name, type, size, createdAt, blob }
   where `type` is one of "pdf" | "word" | "ppt" | "other" (the resource
   category the person picked in "+ Add Resource", not a MIME sniff) and
   `blob` is the real File/Blob object, structured-cloned by IndexedDB.

   Because lesson ids in js/data/emle.js are stable/hardcoded, files
   attached to a given lesson keep showing up for that lesson after a
   page reload even though the rest of the app's data resets on reload
   by design — the attachment survives because it lives here, not there.
   ========================================================================== */

(function (MP) {
  const DB_NAME = "medpocket-files";
  const DB_VERSION = 1;
  const STORE = "files";

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
          store.createIndex("lessonId", "lessonId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Could not open local file storage."));
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `f_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Local file storage request failed."));
    });
  }

  // file: a real File/Blob from an <input type="file"> change event.
  function add({ lessonId, name, type, size, blob }) {
    const record = {
      id: makeId(),
      lessonId,
      name: String(name || "File").trim() || "File",
      type: type || "other", // "pdf" | "word" | "ppt" | "other"
      size: typeof size === "number" ? size : blob && blob.size,
      createdAt: Date.now(),
      blob,
    };
    return tx("readwrite").then((store) => reqToPromise(store.add(record))).then(() => record);
  }

  function get(id) {
    return tx("readonly").then((store) => reqToPromise(store.get(id)));
  }

  function listForLesson(lessonId) {
    return tx("readonly").then(
      (store) =>
        new Promise((resolve, reject) => {
          const index = store.index("lessonId");
          const out = [];
          const cursorReq = index.openCursor(IDBKeyRange.only(lessonId));
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              out.push(cursor.value);
              cursor.continue();
            } else {
              out.sort((a, b) => a.createdAt - b.createdAt);
              resolve(out);
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error || new Error("Could not list local files."));
        })
    );
  }

  function deleteFile(id) {
    return tx("readwrite").then((store) => reqToPromise(store.delete(id)));
  }

  function rename(id, name) {
    return tx("readwrite").then(
      (store) =>
        new Promise((resolve, reject) => {
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            const record = getReq.result;
            if (!record) return resolve(null);
            record.name = String(name || record.name).trim() || record.name;
            const putReq = store.put(record);
            putReq.onsuccess = () => resolve(record);
            putReq.onerror = () => reject(putReq.error || new Error("Could not rename file."));
          };
          getReq.onerror = () => reject(getReq.error || new Error("Could not rename file."));
        })
    );
  }

  MP.files = { add, get, listForLesson, delete: deleteFile, rename };
})(window.MP = window.MP || {});
