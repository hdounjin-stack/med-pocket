(function (MP) {
  MP.calculators.registry.register({
    id: "gcs", title: "GCS", category: "emergency",
    shortDescription: "Glasgow Coma Scale", icon: "brain", hue: "coral",
    methods: [{
      id: "standard", label: "Standard GCS",
      resultUnit: "/15",
      formulaNote: "Teasdale G, Jennett B. Lancet. 1974. Standard 3-component Glasgow Coma Scale (E+V+M).",
      inputs: [
        { id: "eye", label: "Eye Opening", type: "select", required: true, options: [
          { value: "4", label: "Spontaneous" }, { value: "3", label: "To speech" },
          { value: "2", label: "To pressure" }, { value: "1", label: "None" } ] },
        { id: "verbal", label: "Verbal Response", type: "select", required: true, options: [
          { value: "5", label: "Oriented" }, { value: "4", label: "Confused" },
          { value: "3", label: "Inappropriate words" }, { value: "2", label: "Incomprehensible sounds" },
          { value: "1", label: "None" } ] },
        { id: "motor", label: "Motor Response", type: "select", required: true, options: [
          { value: "6", label: "Obeys commands" }, { value: "5", label: "Localizes pain" },
          { value: "4", label: "Normal flexion" }, { value: "3", label: "Abnormal flexion" },
          { value: "2", label: "Extension" }, { value: "1", label: "None" } ] },
      ],
      calculate(v) {
        const eye = Number(v.eye), verbal = Number(v.verbal), motor = Number(v.motor);
        return { value: eye + verbal + motor, unit: "/15", components: { "Eye Opening": eye, "Verbal Response": verbal, "Motor Response": motor } };
      },
      interpret(r) {
        const s = r.value;
        if (s >= 13) return "Mild impairment range (13–15).";
        if (s >= 9) return "Moderate impairment range (9–12).";
        return "Severe impairment range (≤8) — commonly used as a threshold to consider airway protection.";
      },
    }],
  });
})(window.MP = window.MP || {});
