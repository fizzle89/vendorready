/* Sign-up gate. Stores the signup locally; if a capture endpoint is
   configured it also posts there. Without an endpoint nothing leaves
   the browser, and the page says so. */
(function () {
  "use strict";
  var CAPTURE_ENDPOINT = ""; // e.g. a forms-backend URL. Empty = local only.
  var KEY = "vr_user";

  function getUser() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function requireUser() {
    if (!getUser()) { window.location.href = "index.html#access"; return null; }
    return getUser();
  }
  function initGate(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    if (getUser()) { window.location.href = "app.html"; return; }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var err = form.querySelector(".form-error");
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        signed_up_at: new Date().toISOString()
      };
      if (!data.name || !data.email || !data.company) {
        err.textContent = "Fill in your name, work email, and company.";
        err.style.display = "block";
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        err.textContent = "That email address does not look right.";
        err.style.display = "block";
        return;
      }
      localStorage.setItem(KEY, JSON.stringify(data));
      if (CAPTURE_ENDPOINT) {
        try {
          fetch(CAPTURE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(data)
          }).finally(function () { window.location.href = "app.html"; });
        } catch (e) { window.location.href = "app.html"; }
      } else {
        window.location.href = "app.html";
      }
    });
  }
  window.VRGate = { initGate: initGate, requireUser: requireUser, getUser: getUser };
})();
