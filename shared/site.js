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
  // Opening: 2.5-second animated title card, then the childhood-photo invitation.
  const theme = document.body.dataset.theme || "burgundy";
  const splash = document.getElementById("opening");
  splash.innerHTML = '<div class="splash-card"><div class="splash-monogram">K<span>&</span>M</div><div class="splash-rule"></div><div class="splash-names">KIRSTEN <span>&</span> MATTIA</div><div class="splash-date">07 · 12 · 2026</div></div><button type="button" id="openInvite" hidden aria-hidden="true">Open</button>';
  const stage = document.querySelector("#hero");
  stage.innerHTML = '<div class="main-stage"><div class="stage-head"><div class="stage-flourish">✧ ─── ✧</div><p class="stage-kicker">THESE KIDS ARE</p><h1 class="stage-script">getting <span>married</span></h1><p class="stage-tagline">and they can\'t wait to celebrate with you!</p></div><div class="stage-portraits"><figure class="stage-child stage-child-left"><div class="stage-photo-clip"><img id="kirstenPhoto" alt="Kirsten as a child"></div><figcaption>little Kirsten</figcaption></figure><div class="stage-amp">&</div><figure class="stage-child stage-child-right"><div class="stage-photo-clip"><img id="mattiaPhoto" alt="Mattia as a child"></div><figcaption>little Mattia</figcaption></figure></div><div class="stage-bottom"><div class="stage-monogram">K <span>✧</span> M</div><h2>Kirsten <i>&</i> Mattia</h2><time datetime="2026-12-07">07 DECEMBER 2026</time><button type="button" class="primary rsvp-launch">RSVP · LET US KNOW</button><p class="stage-scroll">SCROLL TO SEE OUR STORY ↓</p></div></div>';
  // Keep full-resolution files in assets/ (fallback is temporary if assets have not been uploaded).
  const hiResImages = {kirsten:"../assets/kirsten.webp",mattia:"../assets/mattia.webp"};
  window.addEventListener("load", () => {
    const photoFallback = window.WEDDING_PHOTOS || {};
    for (const person of ["kirsten","mattia"]) {
      const img = document.getElementById(person+"Photo");
      if (!img) continue;
      img.onerror = () => { img.onerror = null; if (photoFallback[person]) img.src = photoFallback[person]; };
      img.src = hiResImages[person];
    }
  }, {once:true});
  // Insert the actual reception photo into the location section, for every theme.
  const locationSection = document.getElementById("details");
  if (locationSection) {
    const locationContent = locationSection.querySelector(".content");
    if (locationContent) {
      const photo = document.createElement("figure");
      photo.className = "reception-photo";
      photo.innerHTML = '<img src="../assets/restaurant.webp" alt="Reception restaurant overlooking the mountains and lake in Mataas Na Kahoy, Batangas" loading="lazy"><figcaption>Our reception venue · Mataas Na Kahoy, Batangas</figcaption>';
      photo.querySelector("img").addEventListener("error", () => photo.classList.add("reception-photo-missing"));
      locationContent.insertBefore(photo, locationContent.querySelector(".two-cols") || locationContent.firstChild);
    }
  }
  document.querySelectorAll(".sponsor-list p").forEach((p) => {
    if (p.textContent.includes("Mario and Rita Morisco")) p.innerHTML = 'Mr. Mario Buccola &amp; Mrs. Rita Morisco';
  });
  window.setTimeout(() => {
    splash.classList.add("dismissed");
    document.body.style.overflow = "";
  }, 2500);

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
  const open = () => { modal.hidden = false; state.step = "find"; state.error = ""; render(); if (state.token && !demo) action("lookup"); };
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
      html = '<div class="ornament">✧</div><h2 id="modalTitle">LET\'S FIND YOU!</h2><p>' + (state.token && !demo ? 'We are checking your personal invitation.' : 'Enter the name on your invitation. No password needed.') + '</p><form id="guestSearch">' +
        '<label for="guestName">Guest name</label><input id="guestName" autocomplete="name" required placeholder="Your full name" value="' + escapeText(state.name) + '">' +
        '' +
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
      state.token = tokenFromUrl;
      if (!state.name && (demo || !state.token)) { state.error = "Please enter the name on your invitation."; render(); return; }
      try {
        if (demo) {
          state.guest = {display_name:state.name, seats:2, rsvp_status:"pending", guest_count:0};
        } else {
          if (!state.token) throw Error("Please open the personal invitation link sent to you by the couple.");
          const response = await fetch(api + "/api/invite?token=" + encodeURIComponent(state.token), {cache:"no-store"});
          const data = await response.json();
          if (!response.ok) throw Error(data.error || "Invitation not found.");
          if (state.name && String(data.guest.display_name).trim().toLocaleLowerCase() !== state.name.toLocaleLowerCase()) throw Error("The name does not match your personal invitation.");
          state.name = String(data.guest.display_name);
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