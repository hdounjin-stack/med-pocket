/* ==========================================================================
   Calculators: Cardiology

   QTc — TWO methods exposed explicitly (Bazett, Fridericia). Both formulas
   verified against ACEP Toxicology Section's QTc overview (acep.org,
   "QTc: So many formulae, but which one to use?", Table 1):
     Bazett     QTc = QT / √RR        (Bazett HC, Heart 1920;7:353–370)
     Fridericia QTc = QT / ∛RR        (Fridericia LS, Heart 1920)
   QT and RR are both entered in milliseconds and converted to seconds
   internally. RR may be given directly or derived from heart rate.
   Known reference case (hand-checkable): QT 400 ms at HR 60 bpm
   (RR = 1.000 s) → Bazett = 400 / 1 = 400 ms; Fridericia = 400 / 1 = 400 ms.
   Second case: QT 400 ms, RR 0.80 s → Bazett = 400/0.894 = 447 ms;
   Fridericia = 400/0.928 = 431 ms.

   CHA₂DS₂-VASc — verified against Lip GYH et al. (Chest 2010;137:263–272,
   the original CHA₂DS₂-VASc paper) and the ESC/AHA point tables reproduced
   in StatPearls/NCBI Bookshelf NBK553096:
     C congestive HF/LV dysfunction ............ 1
     H hypertension ................................ 1
     A2 age ≥75 .................................... 2
     D diabetes .................................... 1
     S2 prior stroke/TIA/thromboembolism .......... 2
     V vascular disease (MI, PAD, aortic plaque) .. 1
     A age 65–74 ................................... 1
     Sc sex category female ........................ 1
   Max 9. Annual stroke-risk bands quoted in interpret() follow the
   Swedish AF cohort rates as summarized by Friberg L et al. (Eur Heart J
   2012) — presented descriptively, not as treatment thresholds.

   HAS-BLED — verified against Pisters R et al., Chest 2010;138:1093–1100
   (original derivation, Euro Heart Survey) and its JACC comparative-
   validation companion (Pisters et al., JACC 2010;56:163–168), including
   the SPORTIF cohort operational definitions quoted there:
     H hypertension (uncontrolled, SBP >160 mmHg) ... 1
     A abnormal renal function AND/OR liver function  1 each (max 2)
     S stroke ......................................... 1
     B bleeding history/predisposition ................ 1
     L labile INR (TTR <60%) .......................... 1
     E elderly (>65 in derivation; commonly applied as >75) 1
     D drugs (antiplatelet/NSAID) + alcohol excess .... 1 each (max 2)
   Max 9.

   HEART Score — verified against Backus BE et al. (Neth Heart J
   2013;21:6-13, external validation) component table and the composition
   table in Six AJ et al. (Neth Heart J 2008):
     History 0/1/2 · ECG 0/1/2 · Age (<45 / 45–64 / ≥65) 0/1/2 ·
     Risk factors (none / 1–2 / ≥3 or known CAD) 0/1/2 ·
     Troponin (≤ULN / 1–3× ULN / >3× ULN) 0/1/2. Total 0–10.

   TIMI Risk Score for UA/NSTEMI — verified against Antman EM et al.,
   JAMA 2000;284(7):835–842 (the original derivation, TIMI 11B/ESSENCE).
   The 7 binary variables (1 point each, 0–7) exactly as published:
     age ≥65 · ≥3 CAD risk factors · known CAD (stenosis ≥50%) ·
     aspirin use in prior 7 days · severe angina (≥2 episodes/24h) ·
     ST deviation ≥0.5 mm · elevated cardiac markers.
   14-day event-rate bands in interpret() are those reported in the same
   paper (4.7% at 0/1 rising to 40.9% at 6/7).

   All interpretations are descriptive study-aid text, not treatment
   advice. No dosing or drug-selection guidance is generated anywhere.
   ========================================================================== */

(function (MP) {
  /* ------------------------------ QTc ------------------------------ */
  const qtcInputs = [
    { id: "qt", label: "QT Interval", unitLabel: "ms", type: "number", min: 150, max: 800, step: "any", required: true, placeholder: "400" },
    { id: "hr", label: "Heart Rate", unitLabel: "bpm", type: "number", min: 25, max: 250, step: "any", required: true, placeholder: "75" },
    { id: "rr_direct", label: "RR Interval (optional — overrides heart rate)", unitLabel: "ms", type: "number", min: 200, max: 3000, step: "any", required: false, placeholder: "e.g. 800" },
  ];
  function rrSeconds(v) {
    if (v.rr_direct !== undefined && v.rr_direct !== null && v.rr_direct !== "") return Number(v.rr_direct) / 1000;
    return 60 / Number(v.hr);
  }

  const QTC = {
    id: "qtc",
    title: "QTc",
    category: "cardiology",
    shortDescription: "Corrected QT interval",
    icon: "heart",
    hue: "coral",
    methods: [
      {
        id: "bazett",
        label: "Bazett (QTc = QT / √RR)",
        resultUnit: "ms",
        formulaNote: "Bazett HC, Heart 1920;7:353–370 — QTc = QT / √RR. Over-corrects at high heart rates, under-corrects at low rates.",
        inputs: qtcInputs,
        calculate(v) {
          const rr = rrSeconds(v);
          const qtc = Number(v.qt) / Math.sqrt(rr);
          return { value: Math.round(qtc), unit: this.resultUnit, components: { "QT": Math.round(Number(v.qt)) + " ms", "RR used": Math.round(rr * 1000) + " ms" } };
        },
        interpret(r) {
          const s = r.value;
          if (s > 500) return ">500 ms — high-risk prolongation band (drug-induced torsades threshold commonly quoted at 500 ms).";
          if (s >= 450) return "450–500 ms — prolonged range in adults (males ≥450, females ≥470 by most conventions).";
          return "<450 ms — not prolonged by the usual adult convention.";
        },
      },
      {
        id: "fridericia",
        label: "Fridericia (QTc = QT / ∛RR)",
        resultUnit: "ms",
        formulaNote: "Fridericia LS, Heart 1920 — QTc = QT / ∛RR. Less rate-dependent than Bazett between roughly 60–100 bpm.",
        inputs: qtcInputs,
        calculate(v) {
          const rr = rrSeconds(v);
          const qtc = Number(v.qt) / Math.cbrt(rr);
          return { value: Math.round(qtc), unit: this.resultUnit, components: { "QT": Math.round(Number(v.qt)) + " ms", "RR used": Math.round(rr * 1000) + " ms" } };
        },
        interpret(r) {
          const s = r.value;
          if (s > 500) return ">500 ms — high-risk prolongation band.";
          if (s >= 450) return "≈450–500 ms — prolonged range in adults.";
          return "<450 ms — not prolonged by the usual adult convention.";
        },
      },
    ],
  };

  /* -------------------------- CHA₂DS₂-VASc -------------------------- */
  const yesNo = (id, label) => ({ id, label, type: "select", required: true, options: [{ value: "0", label: "No" }, { value: "1", label: "Yes" }] });

  const CHADSVASC = {
    id: "cha2ds2-vasc",
    title: "CHA₂DS₂-VASc",
    category: "cardiology",
    shortDescription: "Stroke risk in atrial fibrillation",
    icon: "brain",
    hue: "teal",
    methods: [{
      id: "standard",
      label: "CHA₂DS₂-VASc (Lip 2010)",
      resultUnit: "/9",
      formulaNote: "Lip GYH et al. Chest 2010;137:263–272. Refinement of CHADS₂ adding vascular disease, age 65–74, female sex; age ≥75 and prior stroke/TIA count double.",
      inputs: [
        yesNo("chf", "Congestive HF / LV dysfunction"),
        yesNo("htn", "Hypertension"),
        yesNo("diabetes", "Diabetes mellitus"),
        { id: "stroke", label: "Prior stroke / TIA / thromboembolism", type: "select", required: true, options: [{ value: "0", label: "No" }, { value: "2", label: "Yes" }] },
        yesNo("vascular", "Vascular disease (prior MI, PAD, aortic plaque)"),
        { id: "age", label: "Age", unitLabel: "years", type: "number", min: 18, max: 120, step: "1", required: true, placeholder: "72" },
        { id: "sex", label: "Sex category", type: "select", required: true, options: [{ value: "0", label: "Male" }, { value: "1", label: "Female" }] },
      ],
      calculate(v) {
        const age = Number(v.age);
        const agePts = age >= 75 ? 2 : age >= 65 ? 1 : 0;
        const total =
          Number(v.chf) + Number(v.htn) + Number(v.diabetes) + Number(v.stroke) +
          Number(v.vascular) + agePts + Number(v.sex);
        return {
          value: total, unit: this.resultUnit,
          components: { "CHF/LV": Number(v.chf), HTN: Number(v.htn), Diabetes: Number(v.diabetes), "Stroke/TIA": Number(v.stroke), Vascular: Number(v.vascular), "Age points": agePts, "Sex (female)": Number(v.sex) },
        };
      },
      interpret(r) {
        const bands = { 0: "0.2%", 1: "0.6%", 2: "2.2%", 3: "3.2%", 4: "4.8%", 5: "7.2%", 6: "9.7%", 7: "11.2%", 8: "10.8%", 9: "12.2%" };
        return `Score ${r.value} — adjusted annual stroke risk ≈ ${bands[r.value] || "12%+"} (Swedish AF cohort rates, Friberg 2012). Descriptive only — anticoagulation decisions need full clinical context.`;
      },
    }],
  };

  /* ---------------------------- HAS-BLED ---------------------------- */
  const HASBLED = {
    id: "has-bled",
    title: "HAS-BLED",
    category: "cardiology",
    shortDescription: "Major bleeding risk on anticoagulation",
    icon: "flask",
    hue: "amber",
    methods: [{
      id: "standard",
      label: "HAS-BLED (Pisters 2010)",
      resultUnit: "/9",
      formulaNote: "Pisters R et al. Chest 2010;138:1093–1100 (Euro Heart Survey derivation); JACC 2010;56:163–168 comparative validation. Renal/liver and drugs/alcohol score 1 point EACH (max 2 per pair).",
      inputs: [
        yesNo("htn", "Uncontrolled hypertension (SBP >160 mmHg)"),
        yesNo("renal", "Abnormal renal function (dialysis, transplant, Cr >200 µmol/L)"),
        yesNo("liver", "Abnormal liver function (cirrhosis or bilirubin/AST/ALT markedly deranged)"),
        yesNo("stroke", "Prior stroke"),
        yesNo("bleeding", "Prior major bleeding or predisposition / anemia"),
        yesNo("labile_inr", "Labile INR (TTR <60%)"),
        { id: "elderly_def", label: "Elderly definition used", type: "select", required: true, options: [{ value: "0", label: "Not elderly" }, { value: "1", label: "Age >65 (derivation)" },] },
        yesNo("drugs", "Concomitant antiplatelet / NSAID"),
        yesNo("alcohol", "Alcohol excess (≥8 units/week)"),
      ],
      calculate(v) {
        const total =
          Number(v.htn) + (Number(v.renal) ? 1 : 0) + (Number(v.liver) ? 1 : 0) +
          Number(v.stroke) + Number(v.bleeding) + Number(v.labile_inr) +
          Number(v.elderly_def) + (Number(v.drugs) ? 1 : 0) + (Number(v.alcohol) ? 1 : 0);
        return {
          value: total, unit: this.resultUnit,
          components: { H: Number(v.htn), "A renal+liver": (Number(v.renal) ? 1 : 0) + (Number(v.liver) ? 1 : 0), S: Number(v.stroke), B: Number(v.bleeding), L: Number(v.labile_inr), E: Number(v.elderly_def), "D drugs+alcohol": (Number(v.drugs) ? 1 : 0) + (Number(v.alcohol) ? 1 : 0) },
        };
      },
      interpret(r) {
        if (r.value >= 3) return "≥3 — high bleeding risk band in the derivation cohort (major bleeding rose stepwise with score). Handle with caution and review modifiable factors; not a contraindication by itself.";
        return "0–2 — lower bleeding-risk band in the derivation cohort. Risk is never zero.";
      },
    }],
  };

  /* ----------------------------- HEART ----------------------------- */
  const sel = (id, label, opts) => ({ id, label, type: "select", required: true, options: opts.map(([value, label2]) => ({ value: String(value), label: label2 })) });

  const HEART = {
    id: "heart-score",
    title: "HEART Score",
    category: "cardiology",
    shortDescription: "ED chest pain risk stratification",
    icon: "heartPulse",
    hue: "coral",
    methods: [{
      id: "standard",
      label: "HEART (Six 2008 / Backus 2013)",
      resultUnit: "/10",
      formulaNote: "Six AJ et al., Neth Heart J 2008;16:191–196 (composition); externally validated by Backus BE et al., Neth Heart J 2013;21:6–13. Five elements × 0–2.",
      inputs: [
        sel("history", "History", [[0, "Slightly or non-suspicious"], [1, "Moderately suspicious"], [2, "Highly suspicious"]]),
        sel("ecg", "ECG", [[0, "Normal"], [1, "Non-specific repolarization disturbance"], [2, "Significant ST deviation"]]),
        sel("age", "Age", [[0, "<45"], [1, "45–64"], [2, "≥65"]]),
        sel("risk", "Risk factors / known CAD", [[0, "No risk factors"], [1, "1–2 risk factors"], [2, "≥3 risk factors or history of atherosclerotic disease"]]),
        sel("troponin", "Troponin", [[0, "≤ normal limit"], [1, "1–3× normal limit"], [2, ">3× normal limit"]]),
      ],
      calculate(v) {
        const h = Number(v.history), e = Number(v.ecg), a = Number(v.age), rf = Number(v.risk), t = Number(v.troponin);
        return { value: h + e + a + rf + t, unit: this.resultUnit, components: { History: h, ECG: e, Age: a, "Risk factors": rf, Troponin: t } };
      },
      interpret(r) {
        const s = r.value;
        if (s <= 3) return "0–3 — low-risk band (~1.7% MACE at 6 weeks in the validation cohort).";
        if (s <= 6) return "4–6 — moderate-risk band (~16.6% MACE at 6 weeks in the validation cohort).";
        return "7–10 — high-risk band (~50.1% MACE at 6 weeks in the validation cohort).";
      },
    }],
  };

  /* ------------------------- TIMI UA/NSTEMI ------------------------- */
  const TIMI = {
    id: "timi-ua-nstemi",
    title: "TIMI Risk Score",
    category: "cardiology",
    shortDescription: "UA/NSTEMI 14-day event risk",
    icon: "stethoscope",
    hue: "indigo",
    methods: [{
      id: "standard",
      label: "TIMI UA/NSTEMI (Antman 2000)",
      resultUnit: "/7",
      formulaNote: "Antman EM et al., JAMA 2000;284(7):835–842. Seven binary predictors, 1 point each.",
      inputs: [
        { id: "age65", label: "Age ≥65 years", type: "select", required: true, options: [{ value: "0", label: "No" }, { value: "1", label: "Yes" }] },
        yesNo("rf3", "≥3 cardiac risk factors (HTN, hypercholesterolemia, DM, family history, current smoker)"),
        yesNo("known_cad", "Known CAD (stenosis ≥50%)"),
        yesNo("aspirin7d", "Aspirin use in prior 7 days"),
        yesNo("severe_angina", "≥2 anginal events in past 24 hours"),
        yesNo("st_dev", "ST-segment deviation ≥0.5 mm"),
        yesNo("markers", "Elevated serum cardiac markers"),
      ],
      calculate(v) {
        const pts = ["age65", "rf3", "known_cad", "aspirin7d", "severe_angina", "st_dev", "markers"].reduce((n, k) => n + Number(v[k]), 0);
        return { value: pts, unit: this.resultUnit, components: { "Variables met": pts } };
      },
      interpret(r) {
        const rates = { 0: "4.7%", 1: "4.7%", 2: "8.3%", 3: "13.2%", 4: "19.9%", 5: "26.2%", 6: "40.9%", 7: "40.9%" };
        return `${r.value} point${r.value === 1 ? "" : "s"} — 14-day all-cause mortality/new MI/urgent revascularization ≈ ${rates[r.value]} in TIMI 11B (Antman 2000).`;
      },
    }],
  };

  [QTC, CHADSVASC, HASBLED, HEART, TIMI].forEach((c) => MP.calculators.registry.register(c));
})(window.MP = window.MP || {});
