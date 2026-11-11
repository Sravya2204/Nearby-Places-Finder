// app.js - UI wiring: location, searching, rendering cards, sorting, error messages.
(() => {
  const $ = s => document.querySelector(s);
  const KEY = (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_MAPS_API_KEY) || "";
  const state = { origin: null, places: [], routes: new Map(), last: null, token: 0, activeId: null };
  const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India overview until a location is chosen

  // ---------- helpers ----------
  function setStatus(text, kind = "info") {
    const el = $("#status");
    el.textContent = text;
    el.className = text ? `status show ${kind}` : "status";
  }
  const fmtDist = m => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
  function fmtTime(s) {
    const min = Math.max(1, Math.round(s / 60));
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} hr ${min % 60} min`;
  }
  function describeError(e) {
  const m = String((e && (e.message || e)) || "");

  if (!navigator.onLine) {
    return "Your internet connection is unavailable. Please check your connection.";
  }

  if (e.code === "NETWORK" || e instanceof TypeError) {
    return "Unable to calculate driving routes. Please check the Routes API connection.";
  }

  if (e.code === "QUOTA" || /quota|OVER_QUERY|RESOURCE_EXHAUSTED|429/i.test(m))
    return "The Demo Key's usage limit has been reached. Try again later.";

  if (e.code === "AUTH" || /API key|REQUEST_DENIED|PERMISSION_DENIED|not authorized|403/i.test(m))
    return "Google rejected the API key. Check the API permissions and key configuration.";

  return `Something went wrong: ${m || "unknown error"}`;
}

  // ---------- categories ----------
  function buildCategories() {
    const wrap = $("#categories");
    Object.entries(Places.CATEGORIES).forEach(([k, c]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.key = k; b.setAttribute("aria-pressed", "false");
      const ico = document.createElement("span"); ico.className = "ico"; ico.textContent = c.icon; ico.setAttribute("aria-hidden", "true");
      b.append(ico, document.createTextNode(c.label));
      b.addEventListener("click", () => {
        $("#search-input").value = "";
        run({ cat: k, label: c.label });
      });
      wrap.appendChild(b);
    });
  }
  function markChip(key) {
    document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.key === key)));
  }

  // ---------- location ----------
  async function setOrigin(pos, label) {
    state.origin = { lat: pos.lat, lng: pos.lng };
    $("#location-input").value = label || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
    MapView.setOrigin(state.origin, +$("#radius").value);
    setStatus("Location set. Pick a category or search for something nearby.", "info");
    if (state.last) run(state.last); // refresh results for the new location
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return setStatus("Your browser does not support location. Type an address instead.", "warn");
    const btn = $("#locate-btn"); btn.disabled = true; setStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      p => { btn.disabled = false; setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude }, "My current location"); },
      err => {
        btn.disabled = false;
        const msg = {
          1: "Location permission was denied. Allow location access in your browser, or type an address instead.",
          2: "Your location could not be determined. Type an address instead.",
          3: "Getting your location timed out. Try again or type an address."
        }[err.code] || "Could not get your location.";
        setStatus(msg, "warn");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function submitAddress(e) {
    e.preventDefault();
    const text = $("#location-input").value.trim();
    if (!text) return setStatus("Enter an area or address first.", "warn");
    setStatus("Looking up address…");
    try {
      const found = await Places.findAddress(text);
      if (!found) return setStatus(`Could not find "${text}". Check the spelling or add the city name.`, "warn");
      await setOrigin({ lat: found.lat, lng: found.lng }, found.label);
    } catch (err) { setStatus(describeError(err), "error"); }
  }

  // ---------- searching ----------
  async function run(search) {
    if (!state.origin) return setStatus("Choose a location first: use your current location or type an address.", "warn");
    state.last = search;
    markChip(search.cat || null);
    const token = ++state.token, radius = +$("#radius").value;
    state.places = []; state.routes.clear(); state.activeId = null;
    renderList(); MapView.clearPlaces();
    setStatus(`Searching for ${search.label}…`);
    try {
      const places = search.cat
        ? await Places.searchCategory(search.cat, state.origin, radius)
        : await Places.searchText(search.q, state.origin, radius);
      if (token !== state.token) return;
      state.places = places;
      if (!places.length) {
        renderList();
        return setStatus(`No results for "${search.label}" within ${radius / 1000} km. Try a larger radius or a different keyword.`, "warn");
      }
      renderList();
      MapView.showPlaces(places, selectPlace);
      setStatus(`Found ${places.length} places. Calculating driving routes…`);

      const fatal = await Routes.computeAll(KEY, state.origin, places, (p, r, err) => {
        if (token !== state.token) return;
        state.routes.set(p.id, err ? { failed: true } : r ? r : { failed: true });
        updateCardMeta(p.id);
      });
      if (token !== state.token) return;
      renderList(); // re-sort now that routes are known
      setStatus(fatal ? describeError(fatal) + " Driving times are missing for some places." : `${places.length} places found.`, fatal ? "error" : "info");
    } catch (err) {
      if (token === state.token) { renderList(); setStatus(describeError(err), "error"); }
    }
  }

  // ---------- rendering ----------
  function sortedPlaces() {
    const mode = $("#sort").value, list = [...state.places];
    const val = p => { const r = state.routes.get(p.id); return r && !r.failed ? (mode === "time" ? r.seconds : r.meters) : Infinity; };
    return list.sort((a, b) => val(a) - val(b)); // stable: unrouted keep Google's order at the end
  }

  function metaPills(id) {
    const r = state.routes.get(id), frag = document.createDocumentFragment();
    const pill = (t, cls = "") => { const s = document.createElement("span"); s.className = `pill ${cls}`; s.textContent = t; frag.appendChild(s); };
    if (!r) pill("Calculating route…", "pending");
    else if (r.failed) pill("Route unavailable", "pending");
    else { pill(`${fmtDist(r.meters)} by road`); pill(`${fmtTime(r.seconds)} drive`); }
    return frag;
  }
  function updateCardMeta(id) {
    const el = document.querySelector(`.card[data-id="${CSS.escape(id)}"] .meta`);
    if (el) el.replaceChildren(metaPills(id));
  }

  function renderList() {
    const ul = $("#results"); ul.replaceChildren();
    if (!state.places.length) {
      const li = document.createElement("li"); li.className = "empty";
      li.textContent = state.origin ? "Results will appear here." : "Set a location to get started.";
      return ul.appendChild(li);
    }
    sortedPlaces().forEach(p => {
      const li = document.createElement("li");
      li.className = "card" + (p.id === state.activeId ? " active" : "");
      li.dataset.id = p.id; li.tabIndex = 0;
      const h = document.createElement("h3"); h.textContent = p.name;
      const a = document.createElement("p"); a.className = "addr"; a.textContent = p.address || "Address not provided";
      const meta = document.createElement("div"); meta.className = "meta"; meta.appendChild(metaPills(p.id));
      const link = document.createElement("a");
      link.className = "directions"; link.textContent = "Get directions"; link.target = "_blank"; link.rel = "noopener";
      link.href = `https://www.google.com/maps/dir/?api=1&origin=${state.origin.lat},${state.origin.lng}` +
                  `&destination=${p.lat},${p.lng}&destination_place_id=${encodeURIComponent(p.id)}&travelmode=driving`;
      link.addEventListener("click", ev => ev.stopPropagation());
      li.append(h, a, meta, link);
      li.addEventListener("click", () => selectPlace(p.id, true));
      li.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target === li) selectPlace(p.id, true); });
      ul.appendChild(li);
    });
  }

  function selectPlace(id, fromCard) {
    state.activeId = id;
    document.querySelectorAll(".card").forEach(c => c.classList.toggle("active", c.dataset.id === id));
    const p = state.places.find(x => x.id === id);
    if (p) MapView.focusPlace(id, p.name);
    if (!fromCard) document.querySelector(`.card[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---------- startup ----------
  async function start() {
    buildCategories(); renderList();
    $("#locate-btn").addEventListener("click", useCurrentLocation);
    $("#location-form").addEventListener("submit", submitAddress);
    $("#search-form").addEventListener("submit", e => {
      e.preventDefault();
      const q = $("#search-input").value.trim();
      if (!q) return setStatus("Type what you want to find, e.g. \"laundry shops\".", "warn");
      run({ q, label: q });
    });
    $("#radius").addEventListener("change", () => {
      if (state.origin) MapView.setRadius(state.origin, +$("#radius").value);
      if (state.last) run(state.last);
    });
    $("#sort").addEventListener("change", renderList);
    window.addEventListener("online", () => setStatus("Back online.", "info"));
    window.addEventListener("offline", () => setStatus("You are offline. Searches will fail until the connection returns.", "warn"));
    window.addEventListener("maps-auth-failure", () => setStatus(
      "Google Maps rejected the API key. Check js/config.js and the key's allowed APIs and referrers (localhost / 127.0.0.1).", "error"));

    if (!KEY || KEY.startsWith("PASTE_")) {
      return setStatus("No API key found. Open js/config.js and paste your Google Maps Demo Key, then reload.", "error");
    }
    try {
      await MapView.init($("#map"), KEY, DEFAULT_CENTER, 5);
    } catch (e) {
      setStatus("Could not load Google Maps. Check your internet connection and API key.", "error");
    }
  }
  start();
})();
