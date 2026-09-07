/* ==========================================================================
   Reference data: laboratory values (Quick Reference)

   SEPARATE module by design (see project rules) — shares nothing with the
   calculator registry or EMLE lesson data.

   VALUES POLICY:
   Ranges are COMMON ADULT REFERENCE INTERVALS as stated in standard
   clinical-chemistry references (Tietz, StatPearls/NCBI Bookshelf lab
   reference tables, and the reference intervals quoted by major US labs).
   They are labeled "typical adult" throughout the UI and are NOT diagnostic
   cutoffs; every laboratory reports its own intervals. Where a test has
   well-known sex-specific intervals (Hb, hematocrit), both are shown
   explicitly rather than collapsed into one misleading number.

   Units are given in BOTH conventional (US) and SI where they differ,
   clearly separated — never mixed silently.

   Verified against (accessed Aug 2026):
   - NCBI Bookshelf StatPearls laboratory reference-interval tables
     (e.g. NBK559278 "Reference Range" collection pages per analyte)
   - Medscape/eMedicine clinical chemistry reference-range tables
     (reference.medscape.com "Laboratory Adult Reference Ranges")
   - University of Iowa / Mount-Sinai style published lab handbook ranges
     for CBC coagulation ABG panels
   Cross-checked across at least two independent sources before entry.
   ========================================================================== */

(function (MP) {
  const GROUPS = [
    {
      id: "cbc",
      label: "CBC",
      icon: "blood",
      tests: [
        { abbr: "Hb", name: "Hemoglobin", range: "13.5–17.5 g/dL (men) · 12.0–15.5 g/dL (women)", si: "8.4–10.9 · 7.4–9.6 mmol/L", note: "Sex-specific intervals." },
        { abbr: "WBC", name: "White Blood Cells", range: "4.0–11.0 ×10⁹/L", si: "= 4.0–11.0 ×10³/µL (same convention)" },
        { abbr: "Plt", name: "Platelets", range: "150–450 ×10⁹/L", si: "= 150–450 ×10³/µL" },
        { abbr: "RBC", name: "Red Blood Cells", range: "4.5–5.9 ×10¹²/L (men) · 4.1–5.1 ×10¹²/L (women)", note: "Sex-specific intervals." },
        { abbr: "Hct", name: "Hematocrit", range: "41–50% (men) · 36–44% (women)", note: "Sex-specific intervals." },
        { abbr: "MCV", name: "Mean Corpuscular Volume", range: "80–100 fL" },
        { abbr: "MCH", name: "Mean Corpuscular Hemoglobin", range: "27–33 pg" },
        { abbr: "MCHC", name: "Mean Corpuscular Hemoglobin Concentration", range: "32–36 g/dL" },
      ],
    },
    {
      id: "electrolytes",
      label: "Electrolytes",
      icon: "flask",
      tests: [
        { abbr: "Na", name: "Sodium", range: "135–145 mEq/L", si: "= 135–145 mmol/L" },
        { abbr: "K", name: "Potassium", range: "3.5–5.0 mEq/L", si: "= 3.5–5.0 mmol/L" },
        { abbr: "Cl", name: "Chloride", range: "98–107 mEq/L", si: "= 98–107 mmol/L" },
        { abbr: "HCO₃", name: "Bicarbonate (venous, total CO₂)", range: "22–29 mEq/L", si: "= 22–29 mmol/L" },
        { abbr: "Ca", name: "Calcium (total)", range: "8.5–10.5 mg/dL", si: "2.12–2.62 mmol/L", note: "Ionized Ca ≈ 4.6–5.3 mg/dL (1.15–1.32 mmol/L)." },
        { abbr: "Mg", name: "Magnesium", range: "1.7–2.2 mg/dL", si: "0.70–0.91 mmol/L" },
        { abbr: "PO₄", name: "Phosphate", range: "2.5–4.5 mg/dL", si: "0.81–1.45 mmol/L" },
      ],
    },
    {
      id: "renal",
      label: "Renal",
      icon: "kidney",
      tests: [
        { abbr: "Cr", name: "Creatinine", range: "0.7–1.3 mg/dL (men) · 0.6–1.1 mg/dL (women)", si: "62–115 · 53–97 µmol/L" },
        { abbr: "BUN", name: "Urea Nitrogen", range: "7–20 mg/dL", si: "2.5–7.1 mmol/L urea" },
        { abbr: "eGFR", name: "Estimated GFR (CKD-EPI 2021)", range: ">90 mL/min/1.73m² usual adult upper band", note: "Interpret with KDIGO G1–G5 categories; not a measured GFR." },
        { abbr: "uCrCl", name: "Urea / Creatinine ratio context", range: "BUN:Cr ratio >20:1 suggests prerenal pattern", note: "Contextual, not a range." },
      ],
    },
    {
      id: "liver",
      label: "Liver",
      icon: "gut",
      tests: [
        { abbr: "AST", name: "Aspartate Aminotransferase", range: "10–40 U/L", note: "Method-dependent." },
        { abbr: "ALT", name: "Alanine Aminotransferase", range: "10–40 U/L", note: "Method-dependent; some labs use lower male upper limits (~33)." },
        { abbr: "ALP", name: "Alkaline Phosphatase", range: "40–130 U/L", si: "0.67–2.17 µkat/L", note: "Higher in children/pregnancy." },
        { abbr: "Tbili", name: "Total Bilirubin", range: "0.3–1.2 mg/dL", si: "5–21 µmol/L" },
        { abbr: "Alb", name: "Albumin", range: "3.5–5.0 g/dL", si: "35–50 g/L" },
        { abbr: "TP", name: "Total Protein", range: "6.0–8.3 g/dL", si: "60–83 g/L" },
      ],
    },
    {
      id: "glucose",
      label: "Glucose",
      icon: "drop",
      tests: [
        { abbr: "FBG", name: "Fasting Glucose", range: "70–99 mg/dL", si: "3.9–5.5 mmol/L", note: "ADA: fasting ≥126 on two occasions = diabetes range; this row is the normal interval only." },
        { abbr: "RBG", name: "Random Glucose", range: "<140 mg/dL usual non-fasting band", si: "<7.8 mmol/L" },
        { abbr: "A1c", name: "Hemoglobin A1c", range: "4.0–5.6%", si: "IFCC <37.7 mmol/mol", note: "ADA: ≥6.5% (48 mmol/mol) = diabetes range." },
      ],
    },
    {
      id: "coag",
      label: "Coagulation",
      icon: "shield",
      tests: [
        { abbr: "PT", name: "Prothrombin Time", range: "11–13.5 seconds", note: "Report INR alongside; reagent-dependent." },
        { abbr: "INR", name: "International Normalized Ratio", range: "0.8–1.2 (not anticoagulated)", note: "Target 2.0–3.0 for most warfarin indications." },
        { abbr: "aPTT", name: "Activated Partial Thromboplastin Time", range: "25–35 seconds", note: "Reagent-dependent." },
      ],
    },
    {
      id: "abg",
      label: "ABG",
      icon: "lungs",
      tests: [
        { abbr: "pH", name: "Arterial pH", range: "7.35–7.45" },
        { abbr: "PaCO₂", name: "Arterial PCO₂", range: "35–45 mmHg", si: "4.7–6.0 kPa" },
        { abbr: "PaO₂", name: "Arterial PO₂", range: "80–100 mmHg", si: "10.6–13.3 kPa", note: "Falls with age." },
        { abbr: "HCO₃", name: "Bicarbonate (calculated, arterial)", range: "22–26 mEq/L", si: "= 22–26 mmol/L" },
        { abbr: "BE", name: "Base Excess", range: "−2 to +2 mEq/L" },
        { abbr: "SaO₂", name: "Oxygen Saturation (arterial)", range: "95–100%" },
      ],
    },
    {
      id: "cardiac",
      label: "Cardiac Markers",
      icon: "heartPulse",
      tests: [
        { abbr: "Tn", name: "Troponin I or T", range: "Below assay-specific 99th-percentile URL", note: "Heavily assay-dependent — use YOUR lab's 99th percentile; no universal number exists." },
        { abbr: "CK-MB", name: "Creatine Kinase-MB", range: "0–6 ng/mL (mass) typical", note: "Assay-dependent; largely superseded by troponin." },
        { abbr: "CK", name: "Creatine Kinase (total)", range: "39–308 U/L (men) · 26–192 U/L (women)", si: "0.65–5.13 · 0.43–3.20 µkat/L", note: "Rises with exercise/IM injections." },
        { abbr: "BNP", name: "BNP / NT-proBNP", range: "BNP <100 pg/mL · NT-proBNP <300 pg/mL often used to help rule out HF in acute settings", note: "Cutpoints vary by setting and age — decision limits, not ranges." },
      ],
    },
  ];

  function allGroups() {
    return GROUPS;
  }

  // Scoped search: matches abbreviation, full name, group label, group id.
  // Deliberately local to the reference page — never touches lesson search.
  function search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      tests: g.tests.filter(
        (t) =>
          t.abbr.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q) ||
          (t.note || "").toLowerCase().includes(q)
      ),
    })).filter((g) => g.tests.length > 0);
  }

  MP.reference = { allGroups, search };
})(window.MP = window.MP || {});
