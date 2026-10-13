/* Wizard flow + results rendering for the VendorReady app. */
(function () {
  "use strict";
  var ANSWERS_KEY = "vr_answers";
  var user = window.VRGate.requireUser();
  if (!user) return;

  var E = window.VREngine;
  var answers = {};
  try { answers = JSON.parse(localStorage.getItem(ANSWERS_KEY) || "{}"); } catch (e) {}
  if (!answers.company_name && user.company) answers.company_name = user.company;

  var current = 0;
  var generated = null;
  var activeDoc = "policy";

  var pipsEl = document.getElementById("pips");
  var cardEl = document.getElementById("wizard-card");
  var navEl = document.getElementById("wizard-nav");
  var resultsEl = document.getElementById("results");

  function save() { localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers)); }

  function renderPips() {
    pipsEl.innerHTML = "";
    E.SECTIONS.forEach(function (s, i) {
      var pip = document.createElement("button");
      pip.type = "button";
      pip.className = "pip" + (i === current ? " active" : "") + (i < current ? " done" : "");
      pip.textContent = (i + 1) + ". " + s.title;
      pip.addEventListener("click", function () { collect(); current = i; render(); });
      pipsEl.appendChild(pip);
    });
    var done = document.createElement("span");
    done.className = "pip" + (current === E.SECTIONS.length ? " active" : "");
    done.textContent = "Documents";
    pipsEl.appendChild(done);
  }

  function fieldHtml(q) {
    var v = answers[q.id];
    var h = '<div class="q"><div class="q-label">' + q.label + (q.required ? ' *' : '') + '</div>';
    if (q.help) h += '<p class="q-help">' + q.help + '</p>';
    if (q.type === "text" || q.type === "url" || q.type === "email") {
      h += '<div class="field"><input type="' + q.type + '" name="' + q.id + '" value="' + (v ? String(v).replace(/"/g, "&quot;") : "") + '"' + (q.placeholder ? ' placeholder="' + q.placeholder + '"' : "") + "></div>";
    } else if (q.type === "select") {
      h += '<div class="field"><select name="' + q.id + '"><option value="">Choose one...</option>';
      q.options.forEach(function (o) { h += '<option' + (v === o ? " selected" : "") + ">" + o + "</option>"; });
      h += "</select></div>";
    } else if (q.type === "multi") {
      h += '<div class="checks">';
      q.options.forEach(function (o) {
        var on = Array.isArray(v) && v.indexOf(o) >= 0;
        h += '<label><input type="checkbox" name="' + q.id + '" value="' + o.replace(/"/g, "&quot;") + '"' + (on ? " checked" : "") + "> " + o + "</label>";
      });
      h += "</div>";
    } else if (q.type === "radio") {
      h += '<div class="radios">';
      q.options.forEach(function (o) {
        var val = typeof o === "object" ? o.value : o;
        var lab = typeof o === "object" ? o.label : o;
        h += '<label><input type="radio" name="' + q.id + '" value="' + val + '"' + (v === val ? " checked" : "") + "> " + lab + "</label>";
      });
      h += "</div>";
    }
    return h + "</div>";
  }

  function collect() {
    var sec = E.SECTIONS[current];
    if (!sec) return;
    sec.questions.forEach(function (q) {
      if (q.type === "multi") {
        var boxes = cardEl.querySelectorAll('input[name="' + q.id + '"]:checked');
        answers[q.id] = Array.prototype.map.call(boxes, function (b) { return b.value; });
      } else if (q.type === "radio") {
        var r = cardEl.querySelector('input[name="' + q.id + '"]:checked');
        answers[q.id] = r ? r.value : "";
      } else {
        var inp = cardEl.querySelector('[name="' + q.id + '"]');
        answers[q.id] = inp ? inp.value.trim() : "";
      }
    });
    save();
  }

  function validate() {
    var sec = E.SECTIONS[current];
    var missing = [];
    sec.questions.forEach(function (q) {
      if (!q.required) return;
      var v = answers[q.id];
      if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) missing.push(q.label);
    });
    return missing;
  }

  function render() {
    renderPips();
    resultsEl.style.display = "none";
    cardEl.style.display = "";
    navEl.style.display = "";
    var sec = E.SECTIONS[current];
    cardEl.innerHTML = "<h2>" + sec.title + "</h2><p class='sec-sub'>" + sec.sub + "</p>" +
      sec.questions.map(fieldHtml).join("") +
      '<div class="form-error"></div>';
    navEl.innerHTML = "";
    var back = document.createElement("button");
    back.className = "btn ghost"; back.textContent = "Back";
    back.disabled = current === 0;
    back.style.visibility = current === 0 ? "hidden" : "visible";
    back.addEventListener("click", function () { collect(); current--; render(); });
    var next = document.createElement("button");
    next.className = "btn";
    next.textContent = current === E.SECTIONS.length - 1 ? "Generate my documents" : "Next";
    next.addEventListener("click", function () {
      collect();
      var missing = validate();
      if (missing.length) {
        var err = cardEl.querySelector(".form-error");
        err.textContent = "Still needed: " + missing.join(", ");
        err.style.display = "block";
        return;
      }
      if (current === E.SECTIONS.length - 1) { showResults(); return; }
      current++; render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    navEl.appendChild(back); navEl.appendChild(next);
  }

  function showResults() {
    current = E.SECTIONS.length;
    renderPips();
    cardEl.style.display = "none";
    navEl.style.display = "none";
    generated = E.generateAll(answers);
    var risk = generated.risk;
    var h = '<div class="score-hero"><div class="score-dial rating-' + risk.rating.toLowerCase() + '"><b>' + risk.score + '</b><span>' + risk.rating + '</span></div>' +
      '<div><h2>Your AI risk posture: ' + risk.rating + '</h2>' +
      "<p>Self-assessed from your answers. The full breakdown and fix list is in the Vendor Risk Assessment below.</p></div></div>";
    if (risk.drivers.length) {
      h += '<h3 style="margin:0 0 6px">Top fixes before procurement asks</h3><div class="recs">';
      risk.drivers.slice(0, 3).forEach(function (d) {
        h += '<div class="rec"><b>' + d.label + " (+" + d.points + ')</b><span>' + d.fix + "</span></div>";
      });
      h += "</div>";
    }
    h += '<div class="doctabs">';
    Object.keys(generated.docs).forEach(function (k) {
      h += '<button class="doctab' + (k === activeDoc ? " active" : "") + '" data-doc="' + k + '">' + generated.docs[k].title + "</button>";
    });
    h += "</div>";
    h += '<div class="doc-actions">' +
      '<button class="btn" id="dl-md">Download Markdown</button>' +
      '<button class="btn ghost" id="dl-html">Download HTML</button>' +
      '<button class="btn ghost" id="print-doc">Print / save as PDF</button>' +
      '<button class="btn ghost" id="edit-answers">Edit answers</button>' +
      "</div>";
    h += '<div class="callout warn">These are strong starting templates, not legal advice. Have counsel review before you send them into a procurement process.</div>';
    h += '<div class="docview" id="docview"></div>';
    resultsEl.innerHTML = h;
    resultsEl.style.display = "";
    renderDoc();
    window.scrollTo({ top: 0, behavior: "smooth" });

    resultsEl.querySelectorAll(".doctab").forEach(function (t) {
      t.addEventListener("click", function () {
        activeDoc = t.getAttribute("data-doc");
        resultsEl.querySelectorAll(".doctab").forEach(function (x) { x.classList.toggle("active", x === t); });
        renderDoc();
      });
    });
    document.getElementById("dl-md").addEventListener("click", function () {
      download(activeDocTitle() + ".md", generated.docs[activeDoc].md, "text/markdown");
    });
    document.getElementById("dl-html").addEventListener("click", function () {
      var body = E.mdToHtml(generated.docs[activeDoc].md);
      var page = "<!doctype html><html><head><meta charset='utf-8'><title>" + activeDocTitle() + "</title>" +
        "<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left;vertical-align:top}h2{border-top:1px solid #eee;padding-top:14px}</style>" +
        "</head><body>" + body + "</body></html>";
      download(activeDocTitle() + ".html", page, "text/html");
    });
    document.getElementById("print-doc").addEventListener("click", function () { window.print(); });
    document.getElementById("edit-answers").addEventListener("click", function () { current = 0; render(); });
  }

  function activeDocTitle() {
    return (answers.company_name || "Company") + " - " + generated.docs[activeDoc].title;
  }
  function renderDoc() {
    var doc = generated.docs[activeDoc];
    document.getElementById("docview").innerHTML =
      '<div class="docmeta">' + (answers.company_name || "Company") + " - generated " + new Date().toISOString().slice(0, 10) + "</div>" +
      E.mdToHtml(doc.md);
  }
  function download(name, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name.replace(/[^A-Za-z0-9 .-]/g, "");
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  /* If a full answer set already exists, go straight to results. */
  var complete = E.SECTIONS.every(function (s) {
    return s.questions.every(function (q) {
      if (!q.required) return true;
      var v = answers[q.id];
      return !(v === undefined || v === "" || (Array.isArray(v) && !v.length));
    });
  });
  if (complete) { showResults(); } else { render(); }
})();
