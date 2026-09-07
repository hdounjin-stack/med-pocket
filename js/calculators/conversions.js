/* ==========================================================================
   Calculator unit conversion architecture
   Reusable across any future calculator — a "quantity" (e.g. "creatinine")
   defines a canonical unit and a set of known units with conversion
   functions to/from that canonical unit. Calculators only ever compute in
   the canonical unit; the UI/engine handles normalizing whatever unit the
   person picked before the calculation function ever runs.

   Only the conversions eGFR actually needs are implemented here — this is
   deliberately not a general chemistry-unit library, per the brief
   ("do not implement every possible conversion now").
   ========================================================================== */

(function (MP) {
  // 1 mg/dL creatinine = 88.4 µmol/L — the standard SI conversion factor
  // for creatinine (used ubiquitously in clinical chemistry/lab reporting).
  const QUANTITIES = {
    creatinine: {
      canonicalUnit: "mg/dL",
      units: {
        "mg/dL": {
          label: "mg/dL",
          toCanonical: (v) => v,
          fromCanonical: (v) => v,
        },
        "µmol/L": {
          label: "µmol/L",
          toCanonical: (v) => v / 88.4,
          fromCanonical: (v) => v * 88.4,
        },
      },
    },
    /* --- quantities needed by the Cardiology/Pediatrics/General set ---
       Factors are the standard clinical-chemistry conversions:
       glucose   1 mmol/L = 18.016 mg/dL   (molar mass 180.156 g/mol)
       calcium   1 mmol/L = 4.008 mg/dL    (molar mass 40.078 g/mol)
       albumin   1 g/L    = 0.1 g/dL
       BUN       1 mmol/L urea = 2.801 mg/dL BUN (urea ×2.14 → N, /10) */
    glucose: {
      canonicalUnit: "mg/dL",
      units: {
        "mg/dL": { label: "mg/dL", toCanonical: (v) => v, fromCanonical: (v) => v },
        "mmol/L": { label: "mmol/L", toCanonical: (v) => v * 18.016, fromCanonical: (v) => v / 18.016 },
      },
    },
    calcium: {
      canonicalUnit: "mg/dL",
      units: {
        "mg/dL": { label: "mg/dL", toCanonical: (v) => v, fromCanonical: (v) => v },
        "mmol/L": { label: "mmol/L", toCanonical: (v) => v * 4.008, fromCanonical: (v) => v / 4.008 },
      },
    },
    albumin: {
      canonicalUnit: "g/dL",
      units: {
        "g/dL": { label: "g/dL", toCanonical: (v) => v, fromCanonical: (v) => v },
        "g/L": { label: "g/L", toCanonical: (v) => v / 10, fromCanonical: (v) => v * 10 },
      },
    },
    bun: {
      canonicalUnit: "mg/dL",
      units: {
        "mg/dL": { label: "mg/dL", toCanonical: (v) => v, fromCanonical: (v) => v },
        "mmol/L": { label: "mmol/L (urea)", toCanonical: (v) => v * 2.801, fromCanonical: (v) => v / 2.801 },
      },
    },
  };

  function unitsFor(quantity) {
    const q = QUANTITIES[quantity];
    return q ? Object.keys(q.units) : [];
  }

  function canonicalUnit(quantity) {
    const q = QUANTITIES[quantity];
    return q ? q.canonicalUnit : null;
  }

  // Converts `value` (given in `unit`) into the quantity's canonical unit.
  function toCanonical(value, quantity, unit) {
    const q = QUANTITIES[quantity];
    if (!q) return value;
    const u = q.units[unit];
    if (!u) return value;
    return u.toCanonical(value);
  }

  function convert(value, quantity, fromUnit, toUnit) {
    const q = QUANTITIES[quantity];
    if (!q || !q.units[fromUnit] || !q.units[toUnit]) return value;
    const canonical = q.units[fromUnit].toCanonical(value);
    return q.units[toUnit].fromCanonical(canonical);
  }

  MP.calculators = MP.calculators || {};
  MP.calculators.conversions = { QUANTITIES, unitsFor, canonicalUnit, toCanonical, convert };
})(window.MP = window.MP || {});
