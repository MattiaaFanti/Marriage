(() => {
  "use strict";
  const $ = (sel) => document.querySelector(sel);
  const config = window.WEDDING_CONFIG || {};
  const api = String(config.apiBase || "").replace(/\/+$/, "");
  const demo = !api;
  const modal = $("#modalBackdrop");
  const output = $("#modalContent");
  const music = $("#soundtrack");
  const tokenFromUrl = new URLSearchParams(location.search).get("invite") || "";
  let state = { step: "intro", token: tokenFromUrl, name: "", guest: null, status: "", seats: 1, email: "", message: "", error: "", busy: false };
  const escapeText = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const errorText = () => state.error ? '<p class="error" role="alert">' + escapeText(state.error) + "</p>" : "";
  const button = (label, a) => '<button type="button" class="primary" data-action="' + a + '">' + label + "</button>";
  const demoNote = demo ? '<div class="demo"><strong>DEMO ONLY</strong> — No RSVP is sent to the couple. Cloudflare D1 has not been connected.</div>' : "";
  document.querySelectorAll("[data-date]").forEach(el => el.textContent = config.weddingDate || "Date to be confirmed");
  $("#timeField").textContent = config.weddingTime || "";
  $("#venueField").textContent = config.venue || "Venue details coming soon";
  $("#addressField").textContent = config.address || "";
  $("#directionsField").textContent = config.directions || "";
  if (config.mapUrl && /^https:\/\//.test(config.mapUrl)) { $("#mapLink").href = config.mapUrl; $("#mapLink").hidden = false; }
  if (window.WEDDING_PHOTOS) {
    $("#mattiaPhoto").src = window.WEDDING_PHOTOS.mattia || "";
    $("#kirstenPhoto").src = window.WEDDING_PHOTOS.kirsten || "";
  } else {
    $("#mattiaPhoto").alt += " — upload pending"; $("#kirstenPhoto").alt += " — upload pending";
  }
  if (config.musicFile) music.src = config.musicFile;
  music.volume = 0.18;
  $("#openInvite").addEventListener("click", async () => {
    $("#opening").classList.add("dismissed");
    document.body.style.overflow = "";
    if (music.src) { try { await music.play(); $("#musicText").textContent = "On"; } catch { $("#musicText").textContent = "Off"; } }
  });
  document.body.style.overflow = "hidden";
  $("#musicToggle").addEventListener("click", async () => {
    if (music.paused) { try { await music.play(); $("#musicText").textContent = "On"; } catch { $("#musicText").textContent = "Off"; } }
    else { music.pause(); $("#musicText").textContent = "Off"; }
  });
  document.querySelectorAll(".jump").forEach(el => el.addEventListener("click", () => document.getElementById(el.dataset.target)?.scrollIntoView({behavior:"smooth"})));
  const open = () => { modal.hidden = false; state.step = "intro"; state.error = ""; render(); };
  const close = () => { modal.hidden = true; state.error = ""; };
  document.querySelectorAll(".rsvp-launch").forEach(el => el.addEventListener("click", open));
  $("#modalClose").addEventListener("click", close);
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) close(); });
  const palette = '<div class="palette"><div class="swatch" style="--shade:#e0c8ac"><span>Sand</span></div><div class="swatch" style="--shade:#cba783"><span>Caramel</span></div><div class="swatch" style="--shade:#bb946f"><span>Camel</span></div><div class="swatch" style="--shade:#a87650"><span>Toffee</span></div><div class="swatch" style="--shade:#896248"><span>Mocha</span></div></div>';
  function render() {
    let html = "";
    if (state.step === "intro") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">YOU\'RE ON THE LIST!</h2><p>This page is reserved for invited guests. Please follow the steps to confirm your attendance.</p>' +
        (state.token ? '<div class="info">Your individual invitation link is ready.</div>' : '<div class="info">Use the personal invitation code provided by the couple.</div>') +
        demoNote + button("Enter", "instructions");
    }
    if (state.step === "instructions") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">BEFORE YOU RSVP</h2><p>A little note before you go ahead.</p><div class="info"><p>One response per invitation. You can return using the same link to update your response. Please do not exceed the seats reserved under your name.</p></div>' + button("I understand", "find");
    }
    if (state.step === "find") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">LET\'S FIND YOU!</h2><p>Enter the name on your invitation.</p><form id="guestSearch">' +
        '<label for="guestName">Guest name</label><input id="guestName" autocomplete="name" required placeholder="Your full name" value="' + escapeText(state.name) + '">' +
        '<label for="guestToken">Personal invitation code</label><input id="guestToken" autocomplete="off" placeholder="Invitation code" value="' + escapeText(state.token) + '">' +
        errorText() + demoNote + button("Search invitation", "lookup") + '</form>';
    }
    if (state.step === "decision") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">WE FOUND YOU!</h2><p>We would love to see you at our wedding.</p><div class="person">' +
        escapeText(state.guest.display_name) + '<br><small>' + Number(state.guest.seats) + ' seat(s) reserved</small></div>' +
        '<div class="choices"><button type="button" class="choice ' + (state.status === "attending" ? "selected" : "") + '" data-choice="attending">Attending</button>' +
        '<button type="button" class="choice ' + (state.status === "not_attending" ? "selected" : "") + '" data-choice="not_attending">Not attending</button></div>' +
        (state.status === "attending" ? '<label for="guestSeats">How many reserved seats will you use?</label><input class="count" type="number" id="guestSeats" min="1" max="' + Number(state.guest.seats) + '" value="' + Number(state.seats) + '">' : "") +
        errorText() + button("Continue", "contact");
    }
    if (state.step === "contact") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">ONE LAST THING</h2><p>An email is optional; it helps us send practical updates.</p>' +
        '<label for="guestEmail">Email (optional)</label><input type="email" id="guestEmail" autocomplete="email" placeholder="you@example.com" value="' + escapeText(state.email) + '">' +
        '<label for="guestMessage">Message to the couple (optional)</label><textarea id="guestMessage" rows="3" maxlength="500">' + escapeText(state.message) + '</textarea>' +
        errorText() + (state.busy ? button("Saving…", "wait") : button("Confirm RSVP", "submit"));
    }
    if (state.step === "dress") {
      html = '<div class="ornament">✧</div><h2 id="modalTitle">A LITTLE NOTE FROM US</h2><h3>Celebrate in caramel</h3><p>Please dress in warm, elegant shades of caramel, camel, sand or light brown.</p>' +
        palette + '<div class="info"><strong>Keep it simple & elegant.</strong><p>Solid colors preferred. No busy patterns or bold prints.</p></div>' + button("Got it! Consider it noted.", "done");
    }
    if (state.step === "done") {
      html = '<div class="success">✓</div><h2 id="modalTitle">' + (state.status === "attending" ? "SEE YOU THERE!" : "THANK YOU FOR LETTING US KNOW") + '</h2><p>' +
        (state.status === "attending" ? "We have recorded your attendance and can’t wait to celebrate with you." : "Your RSVP has been recorded. Thank you for replying.") +
        '</p>' + demoNote + button("Done", "close");
    }
    output.innerHTML = html;
    output.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", async (e) => { e.preventDefault(); await action(btn.dataset.action); }));
    output.querySelectorAll("[data-choice]").forEach(btn => btn.addEventListener("click", () => { state.status = btn.dataset.choice; state.error = ""; render(); }));
    output.querySelector("#guestSearch")?.addEventListener("submit", async e => { e.preventDefault(); await action("lookup"); });
  }
  async function action(command) {
    if (command === "close") { close(); return; }
    if (command === "instructions" || command === "find" || command === "done") {
      state.step = command; state.error = ""; render(); return;
    }
    if (command === "lookup") {
      state.name = $("#guestName")?.value.trim() || "";
      state.token = $("#guestToken")?.value.trim() || "";
      if (!state.name) { state.error = "Please enter the name on your invitation."; render(); return; }
      try {
        if (demo) {
          state.guest = {display_name:state.name, seats:2, rsvp_status:"pending", guest_count:0};
        } else {
          if (!state.token) throw Error("Please enter the personal invitation code we sent you.");
          const response = await fetch(api + "/api/invite?token=" + encodeURIComponent(state.token), {cache:"no-store"});
          const data = await response.json();
          if (!response.ok) throw Error(data.error || "Invitation not found.");
          if (String(data.guest.display_name).trim().toLocaleLowerCase() !== state.name.toLocaleLowerCase()) throw Error("The name does not match this invitation code.");
          state.guest = data.guest;
        }
        state.status = state.guest.rsvp_status === "pending" ? "" : state.guest.rsvp_status;
        state.seats = Math.max(1, Number(state.guest.guest_count) || 1);
        state.email = state.guest.email || ""; state.message = state.guest.message || "";
        state.error = ""; state.step = "decision"; render();
      } catch(e) { state.error = String(e.message || e); render(); }
      return;
    }
    if (command === "contact") {
      if (state.status !== "attending" && state.status !== "not_attending") {
        state.error = "Select Attending or Not attending."; render(); return;
      }
      state.seats = state.status === "attending" ? Number($("#guestSeats")?.value || 1) : 0;
      if (state.status === "attending" && (!Number.isInteger(state.seats) || state.seats < 1 || state.seats > Number(state.guest.seats))) {
        state.error = "Invalid number of reserved seats."; render(); return;
      }
      state.error = ""; state.step = "contact"; render(); return;
    }
    if (command === "submit") {
      if (state.busy) return;
      state.email = $("#guestEmail")?.value.trim() || "";
      state.message = $("#guestMessage")?.value.trim() || "";
      if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
        state.error = "Enter a valid email or leave it blank."; render(); return;
      }
      state.busy = true; render();
      try {
        if (demo) {
          localStorage.setItem("wedding-rsvp-demo", JSON.stringify({name:state.name,status:state.status,seats:state.seats,email:state.email,message:state.message,date:new Date().toISOString()}));
        } else {
          const response = await fetch(api + "/api/rsvp", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:state.token,status:state.status,guest_count:state.seats,email:state.email,message:state.message})});
          const result = await response.json();
          if (!response.ok) throw Error(result.error || "Could not save RSVP.");
        }
        state.error = ""; state.step = "dress";
      } catch(e) { state.error = e.message || "Could not save the RSVP."; }
      finally { state.busy = false; render(); }
    }
  }
})();