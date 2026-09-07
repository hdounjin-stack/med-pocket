/* ==========================================================================
   Calculators: Pediatrics

   Maintenance Fluids — Holliday-Segar method, verified against the
   original publication (Holliday MA, Segar WE. "The maintenance need for
   water in parenteral fluid therapy." Pediatrics 1957;19(5 Pt 1):823–832)
   and its standard statement in pediatric references:
     Daily:   100 mL/kg/day for the first 10 kg
              + 50 mL/kg/day for each kg from 11–20 kg
              + 20 mL/kg/day for each kg above 20 kg
     Hourly:  the same rule expressed per hour — the classic 4-2-1 rule
              (4 mL/kg/hr first 10 kg · 2 mL/kg/hr next 10 kg · 1 mL/kg/hr thereafter).
   Reference cases (hand-verified against published worked examples):
     8 kg  → 800 mL/day, 32 mL/hr
     15 kg → 1250 mL/day, 50 mL/hr
     25 kg → 1600 mL/day, 65 mL/hr

   Weight-Based Dose — PURE arithmetic on user-supplied numbers. There are
   NO drug names, NO dosing recommendations, and NO reference values of any
   kind in this calculator. It only computes dose × weight with optional
   frequency and a maximum-dose cap, so it can be applied to whatever dose
   the prescriber's own protocol/formulary states.
   ========================================================================== */

(function (MP) {
  const FLUIDS = {
    id: "peds-maintenance-fluids",
    title: "Pediatric Maintenance Fluids",
    category: "pediatrics",
    shortDescription: "Holliday-Segar 100/50-20 · 4-2-1",
    icon: "baby",
    hue: "teal",
    methods: [{
      id: "holliday-segar",
      label: "Holliday-Segar (1957)",
      resultUnit: "mL/day",
      formulaNote:
        "Holliday MA, Segar WE. Pediatrics 1957;19(5):823–832. 100 mL/kg/day (first 10 kg) + 50 mL/kg/day (next 10 kg) + 20 mL/kg/day (>20 kg). Hourly rate is the 4-2-1 rule. Maintenance only — not for resuscitation or deficit replacement; use ideal body weight in obesity.",
      inputs: [
        { id: "weight", label: "Weight", unitLabel: "kg", type: "number", min: 0.5, max: 100, step: "any", required: true, placeholder: "15" },
      ],
      calculate(v) {
        const w = Number(v.weight);
        let daily;
        if (w <= 10) daily = w * 100;
        else if (w <= 20) daily = 1000 + (w - 10) * 50;
        else daily = 1000 + 500 + (w - 20) * 20;
        // 4-2-1 hourly rule (the bedside form of the same tiers)
        let hourly;
        if (w <= 10) hourly = w * 4;
        else if (w <= 20) hourly = 40 + (w - 10) * 2;
        else hourly = 40 + 20 + (w - 20) * 1;
        return {
          value: Math.round(daily), unit: "mL/day",
          components: { "Hourly rate": Math.round(hourly) + " mL/hr" },
        };
      },
      interpret() {
        return "Maintenance water requirement for a euvolemic, afebrile child. Adjust for fever/losses; restrict in SIADH, heart failure, oliguric AKI. Composition guidance (e.g. isotonic fluids per AAP 2018) is outside this calculator.";
      },
    }],
  };

  const DOSE = {
    id: "weight-based-dose",
    title: "Weight-Based Dose",
    category: "pediatrics",
    shortDescription: "Generic mg/kg math (no drug data)",
    icon: "pill",
    hue: "amber",
    methods: [{
      id: "generic",
      label: "Generic weight-based arithmetic",
      resultUnit: "mg/dose",
      formulaNote:
        "Pure arithmetic: single dose = weight × dose-per-kg; daily = single × doses-per-day; capped at the maximum single dose you supply if given. Contains NO drug references — supply the dose from your own verified source.",
      inputs: [
        { id: "weight", label: "Weight", unitLabel: "kg", type: "number", min: 0.5, max: 150, step: "any", required: true, placeholder: "12" },
        { id: "dose_per_kg", label: "Dose per kg", unitLabel: "mg/kg/dose", type: "number", min: 0.001, max: 500, step: "any", required: true, placeholder: "15" },
        { id: "times_per_day", label: "Doses per day", type: "number", min: 1, max: 12, step: "1", required: false, placeholder: "3" },
        { id: "max_single", label: "Max single dose (optional cap)", unitLabel: "mg", type: "number", min: 0.01, max: 10000, step: "any", required: false, placeholder: "e.g. 500" },
      ],
      calculate(v) {
        const w = Number(v.weight);
        const dpk = Number(v.dose_per_kg);
        let single = w * dpk;
        const capped = v.max_single !== undefined && v.max_single !== "" && single > Number(v.max_single);
        if (capped) single = Number(v.max_single);
        const perDay = v.times_per_day ? single * Number(v.times_per_day) : null;
        return {
          value: Math.round(single * 100) / 100,
          unit: "mg/dose",
          components: {
            ...(capped ? { Note: "Capped at your maximum single dose" } : {}),
            ...(perDay !== null ? { "Daily total": Math.round(perDay * 100) / 100 + " mg/day" } : {}),
          },
        };
      },
      interpret(r) {
        return r.components && r.components.Note
          ? "The uncapped weight-based dose exceeded your maximum — the cap was applied."
          : "Uncapped weight-based dose. Verify the dose-per-kg against your own formulary/protocol before use.";
      },
    }],
  };

  [FLUIDS, DOSE].forEach((c) => MP.calculators.registry.register(c));
})(window.MP = window.MP || {});
