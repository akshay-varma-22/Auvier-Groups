/*
 * Lightweight website assistant (no AI API, no server, $0 running cost).
 *
 * Answers the business's common questions from a configured list, and collects enquiries (name, contact,
 * message). In a client build the enquiry is emailed to the business (e.g. through the client's own
 * form service); in these demos nothing is sent anywhere.
 *
 * Configure with window.CHATBOT_CONFIG before loading this script:
 *   { name, subtitle, greeting, quickReplies: [..], intents: [{ keys: [..], answer }], fallback,
 *     leadIntro, leadThanks, demo: true }
 * All text is inserted with textContent: visitor input is never treated as HTML.
 */
(function () {
  "use strict";
  var cfg = window.CHATBOT_CONFIG;
  if (!cfg) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function normalise(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Best intent by keyword hits (multi-word keys count double). Intents marked `generic` (e.g. "prices")
   * count half, so "how much is balayage?" gets the balayage answer rather than the general price list.
   * On a tie a specific intent beats a generic one. Returns null when nothing matches.
   */
  function match(text) {
    var t = " " + normalise(text) + " ";
    var best = null;
    var bestScore = 0;
    (cfg.intents || []).forEach(function (intent) {
      var score = 0;
      intent.keys.forEach(function (k) {
        var nk = normalise(k);
        if (t.indexOf(" " + nk + " ") !== -1 || (nk.length >= 4 && t.indexOf(nk) !== -1)) score += k.indexOf(" ") !== -1 ? 2 : 1;
      });
      if (intent.generic) score = score / 2;
      if (score > bestScore || (score > 0 && score === bestScore && best && best.generic && !intent.generic)) {
        bestScore = score;
        best = intent;
      }
    });
    return best;
  }

  // ── UI ────────────────────────────────────────────────────────────
  var launcher = el("button", "cb-launcher");
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open chat with " + cfg.name);
  launcher.setAttribute("aria-expanded", "false");
  launcher.textContent = "💬";
  var badge = el("span", "cb-badge", "1");
  launcher.appendChild(badge);

  var panel = el("section", "cb-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", cfg.name + " chat");

  var head = el("div", "cb-head");
  var avatar = el("div", "cb-avatar", "🤖");
  var title = el("div");
  title.appendChild(el("strong", null, cfg.name));
  title.appendChild(el("small", null, cfg.subtitle || "Usually replies instantly"));
  var close = el("button", "cb-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  head.appendChild(avatar);
  head.appendChild(title);
  head.appendChild(close);

  var log = el("div", "cb-log");
  log.setAttribute("aria-live", "polite");
  var quick = el("div", "cb-quick");
  var form = el("form", "cb-form");
  var input = el("input");
  input.type = "text";
  input.placeholder = "Type your question…";
  input.setAttribute("aria-label", "Your message");
  input.maxLength = 500;
  var send = el("button", null, "Send");
  send.type = "submit";
  form.appendChild(input);
  form.appendChild(send);
  var foot = el(
    "div",
    "cb-foot",
    cfg.demo ? "Demo assistant: nothing you type is sent anywhere." : cfg.footNote || "Details you share are sent only to our team.",
  );

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(quick);
  panel.appendChild(form);
  panel.appendChild(foot);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  function say(text, who) {
    var m = el("div", "cb-msg " + (who || "bot"), text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  function setQuick(options) {
    quick.textContent = "";
    (options || []).forEach(function (label) {
      var b = el("button", null, label);
      b.type = "button";
      b.addEventListener("click", function () {
        handle(label);
      });
      quick.appendChild(b);
    });
  }

  // ── Conversation ──────────────────────────────────────────────────
  var lead = null; // { step: "name" | "contact" | "message", data: {} }
  var LEAD_WORDS = ["book", "appointment", "quote", "estimate", "call me", "contact", "talk to", "speak", "callback", "schedule"];

  function startLead() {
    lead = { step: "name", data: {} };
    say(cfg.leadIntro || "Happy to help! What's your name?");
    setQuick([]);
  }

  function continueLead(text) {
    if (lead.step === "name") {
      lead.data.name = text.slice(0, 60);
      lead.step = "contact";
      say("Thanks, " + lead.data.name + "! What's the best phone number or email to reach you?");
    } else if (lead.step === "contact") {
      var ok = /@/.test(text) || text.replace(/\D/g, "").length >= 7;
      if (!ok) return say("Could you share a phone number or an email address so the team can get back to you?");
      lead.data.contact = text.slice(0, 80);
      lead.step = "message";
      say("Got it. Briefly, what do you need help with?");
    } else {
      lead.data.message = text.slice(0, 300);
      var data = lead.data;
      var thanks = (cfg.leadThanks || "Thanks {name}! We'll be in touch shortly.").replace("{name}", data.name);
      lead = null;
      setQuick(cfg.quickReplies);
      if (cfg.leadEndpoint && !cfg.demo) {
        say("Sending…");
        sendLead({ source: "chat", name: data.name, contact: data.contact, message: data.message }).then(function (ok) {
          say(ok ? thanks : cfg.leadFailure || "Sorry, that didn't go through. Please email us instead.");
        });
      } else {
        say(thanks + (cfg.demo ? "\n\n(Demo: in a real site this enquiry is emailed to the business straight away.)" : ""));
      }
    }
  }

  var loadedAt = Date.now();

  /** POST a lead to the site's endpoint. Resolves true on success. Never throws. */
  function sendLead(payload) {
    payload.page = location.pathname;
    payload.elapsedMs = Date.now() - loadedAt;
    return fetch(cfg.leadEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.ok;
      })
      .catch(function () {
        return false;
      });
  }

  function handle(raw) {
    var text = String(raw || "").trim();
    if (!text) return;
    say(text, "user");
    if (lead) return continueLead(text);
    if (text === "Yes, contact me") return startLead();
    if (text === "No thanks") {
      say("No problem! Ask me anything else.");
      return setQuick(cfg.quickReplies);
    }
    var t = normalise(text);
    var wantsLead = LEAD_WORDS.some(function (w) {
      return t.indexOf(w) !== -1;
    });
    var intent = match(text);
    if (intent) {
      say(intent.answer);
      if (intent.offerLead || wantsLead) setTimeout(startLead, 400);
      return;
    }
    if (wantsLead) return startLead();
    say(cfg.fallback || "I'm not sure about that one. Would you like the team to get back to you?");
    setQuick(["Yes, contact me", "No thanks"]);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    handle(v);
  });

  var opened = false;
  function open() {
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    badge.style.display = "none";
    if (!opened) {
      opened = true;
      say(cfg.greeting || "Hi! How can I help?");
      setQuick(cfg.quickReplies);
    }
    setTimeout(function () {
      input.focus();
    }, 50);
  }
  function hide() {
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (panel.classList.contains("open")) hide();
    else open();
  });
  close.addEventListener("click", hide);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) hide();
  });
  // Real lead forms: send the fields to the endpoint, then show success or a fallback message.
  document.querySelectorAll("form[data-lead-form]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = f.querySelector("button[type=submit]");
      var ok = f.querySelector(".form-success");
      var err = f.querySelector(".form-error");
      var payload = { source: "form" };
      new FormData(f).forEach(function (v, k) {
        payload[k] = String(v);
      });
      if (btn) btn.disabled = true;
      if (err) err.style.display = "none";
      sendLead(payload).then(function (sent) {
        if (sent) {
          if (ok) ok.style.display = "block";
          f.querySelectorAll("input, select, textarea, button[type=submit]").forEach(function (x) {
            x.disabled = true;
          });
        } else {
          if (err) err.style.display = "block";
          if (btn) btn.disabled = false;
        }
      });
    });
  });

  // Demo forms on the page: show a success message, send nothing.
  document.querySelectorAll("form[data-demo-form]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = f.querySelector(".form-success");
      if (ok) ok.style.display = "block";
      f.querySelectorAll("input, select, textarea, button[type=submit]").forEach(function (x) {
        x.disabled = true;
      });
    });
  });
})();
