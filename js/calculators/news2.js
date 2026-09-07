(function (MP) {
  function rrScore(v) { if (v <= 8) return 3; if (v <= 11) return 1; if (v <= 20) return 0; if (v <= 24) return 2; return 3; }
  function spo2Score(v) { if (v <= 91) return 3; if (v <= 93) return 2; if (v <= 95) return 1; return 0; }
  function sbpScore(v) { if (v <= 90) return 3; if (v <= 100) return 2; if (v <= 110) return 1; if (v <= 219) return 0; return 3; }
  function pulseScore(v) { if (v <= 40) return 3; if (v <= 50) return 1; if (v <= 90) return 0; if (v <= 110) return 1; if (v <= 130) return 2; return 3; }
  function tempScore(v) { if (v <= 35.0) return 3; if (v <= 36.0) return 1; if (v <= 38.0) return 0; if (v <= 39.0) return 1; return 2; }

  MP.calculators.registry.register({
    id: "news2", title: "NEWS2", category: "emergency",
    shortDescription: "National Early Warning Score 2", icon: "heartPulse", hue: "amber",
    methods: [{
      id: "scale1", label: "NEWS2 (SpO₂ Scale 1)",
      resultUnit: "points",
      formulaNote: "Royal College of Physicians. National Early Warning Score (NEWS) 2. RCP, 2017. SpO₂ Scale 1 (standard patients).",
      inputs: [
        { id: "rr", label: "Respiratory Rate", unitLabel: "/min", type: "number", min: 1, max: 60, step: "any", required: true, placeholder: "18" },
        { id: "spo2", label: "Oxygen Saturation", unitLabel: "%", type: "number", min: 50, max: 100, step: "any", required: true, placeholder: "97" },
        { id: "o2", label: "Supplemental Oxygen", type: "select", required: true, options: [
          { value: "0", label: "Room air" }, { value: "1", label: "On supplemental oxygen" } ] },
        { id: "sbp", label: "Systolic Blood Pressure", unitLabel: "mmHg", type: "number", min: 40, max: 300, step: "any", required: true, placeholder: "120" },
        { id: "pulse", label: "Pulse", unitLabel: "/min", type: "number", min: 20, max: 250, step: "any", required: true, placeholder: "80" },
        { id: "consciousness", label: "Consciousness", type: "select", required: true, options: [
          { value: "alert", label: "Alert" }, { value: "cvpu", label: "New confusion / Voice / Pain / Unresponsive" } ] },
        { id: "temp", label: "Temperature", unitLabel: "°C", type: "number", min: 25, max: 45, step: "any", required: true, placeholder: "37.0" },
      ],
      calculate(v) {
        const rr = rrScore(Number(v.rr));
        const spo2 = spo2Score(Number(v.spo2));
        const o2 = Number(v.o2) === 1 ? 2 : 0;
        const sbp = sbpScore(Number(v.sbp));
        const pulse = pulseScore(Number(v.pulse));
        const consciousness = v.consciousness === "alert" ? 0 : 3;
        const temp = tempScore(Number(v.temp));
        const total = rr + spo2 + o2 + sbp + pulse + consciousness + temp;
        const anyThree = [rr, spo2, sbp, pulse, consciousness, temp].some((s) => s === 3);
        return {
          value: total, unit: "points", anyThree,
          components: { "Respiratory Rate": rr, "SpO₂": spo2, "Air/Oxygen": o2, "Systolic BP": sbp, "Pulse": pulse, "Consciousness": consciousness, "Temperature": temp },
        };
      },
      interpret(r) {
        if (r.value >= 7) return "High clinical risk range (≥7) — emergency-level response per NEWS2.";
        if (r.value >= 5 || r.anyThree) return "Medium clinical risk (5–6, or any single parameter scoring 3) — urgent review threshold.";
        if (r.value >= 1) return "Low clinical risk range (1–4) — increased monitoring frequency.";
        return "Low clinical risk range (0) — routine monitoring.";
      },
    }],
  });
})(window.MP = window.MP || {});
