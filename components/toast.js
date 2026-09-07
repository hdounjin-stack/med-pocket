/* ==========================================================================
   Component: Toast
   ========================================================================== */

(function (MP) {
  let timer = null;

  function mount(root) {
    root.insertAdjacentHTML("beforeend", `<div class="toast" data-toast></div>`);
    const node = MP.dom.qs("[data-toast]", root);
    return {
      show(message, hue = "teal") {
        node.innerHTML = `<span class="toast-dot hue-${hue}"></span>${message}`;
        node.classList.add("is-visible");
        clearTimeout(timer);
        timer = setTimeout(() => node.classList.remove("is-visible"), 2200);
      },
    };
  }

  MP.components = MP.components || {};
  MP.components.toast = { mount };
})(window.MP = window.MP || {});
