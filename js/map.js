// map.js - Google Maps JavaScript API: loading, markers, focus, radius circle.
const MapView = (() => {
  let map, infoWindow, PinElement, AdvancedMarkerElement, originMarker, circle;
  const placeMarkers = new Map();

  function loadScript(key) {
    return new Promise((resolve, reject) => {
      if (window.google && google.maps) return resolve();
      window.gm_authFailure = () => window.dispatchEvent(new Event("maps-auth-failure"));
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&v=weekly`;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("MAPS_SCRIPT_FAILED"));
      document.head.appendChild(s);
    });
  }

  async function init(el, key, center, zoom) {
    await loadScript(key);
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    ({ PinElement, AdvancedMarkerElement } = await google.maps.importLibrary("marker"));
    map = new Map(el, {
      center, zoom,
      mapId: "DEMO_MAP_ID", // required for AdvancedMarkerElement
      zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true
    });
    infoWindow = new InfoWindow();
  }

  function pin(background, glyph) {
    return new PinElement({ background, borderColor: "#10252B", glyphColor: glyph || "#fff" }).element;
  }

  function setOrigin(pos, radius) {
    if (originMarker) originMarker.map = null;
    originMarker = new AdvancedMarkerElement({ map, position: pos, title: "Your selected location", content: pin("#F59E0B", "#10252B"), zIndex: 999 });
    originMarker.addListener("click", () => showInfo(originMarker, "Your selected location"));
    map.panTo(pos);
    map.setZoom(14);
    setRadius(pos, radius);
  }

  function setRadius(pos, radius) {
    if (circle) circle.setMap(null);
    circle = new google.maps.Circle({
      map, center: pos, radius, strokeColor: "#0F766E", strokeOpacity: .6, strokeWeight: 1.5,
      fillColor: "#0F766E", fillOpacity: .06, clickable: false
    });
  }

  function showInfo(marker, text) {
    const div = document.createElement("div");
    div.style.fontWeight = "600";
    div.textContent = text; // textContent avoids HTML injection
    infoWindow.setContent(div);
    infoWindow.open({ map, anchor: marker });
  }

  function clearPlaces() {
    placeMarkers.forEach(m => (m.map = null));
    placeMarkers.clear();
    infoWindow && infoWindow.close();
  }

  function showPlaces(places, onSelect) {
    clearPlaces();
    const bounds = new google.maps.LatLngBounds();
    places.forEach(p => {
      const marker = new AdvancedMarkerElement({
        map, position: { lat: p.lat, lng: p.lng }, title: p.name, content: pin("#0F766E")
      });
      marker.addListener("click", () => { showInfo(marker, p.name); onSelect(p.id); });
      placeMarkers.set(p.id, marker);
      bounds.extend(marker.position);
    });
    if (originMarker) bounds.extend(originMarker.position);
    map.fitBounds(bounds, 60);
  }

  function focusPlace(id, name) {
    const marker = placeMarkers.get(id);
    if (!marker) return;
    map.panTo(marker.position);
    if (map.getZoom() < 15) map.setZoom(15);
    showInfo(marker, name);
  }

  return { init, setOrigin, setRadius, showPlaces, clearPlaces, focusPlace };
})();
