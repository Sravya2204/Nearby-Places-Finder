// places.js - Places API (New): Nearby Search, Text Search and address lookup.
const Places = (() => {
  const CATEGORIES = {
    pg:          { label: "PGs",           icon: "🛏️", query: "PG accommodation" },
    restaurant:  { label: "Restaurants",   icon: "🍽️", types: ["restaurant"] },
    hospital:    { label: "Hospitals",     icon: "🏥", types: ["hospital"] },
    petrol:      { label: "Petrol bunks",  icon: "⛽", types: ["gas_station"] },
    pharmacy:    { label: "Pharmacies",    icon: "💊", types: ["pharmacy"] },
    atm:         { label: "ATMs",          icon: "🏧", types: ["atm"] },
    supermarket: { label: "Supermarkets",  icon: "🛒", types: ["supermarket"] },
    hotel:       { label: "Hotels",        icon: "🏨", types: ["hotel"] },
    bus:         { label: "Bus stops",     icon: "🚌", types: ["bus_stop", "bus_station"] },
    metro:       { label: "Metro stations",icon: "🚇", types: ["subway_station", "light_rail_station"] }
  };
  const FIELDS = ["id", "displayName", "formattedAddress", "location"];

  function toRad(d) { return d * Math.PI / 180; }
  // Straight-line distance, used ONLY to enforce the radius filter (never shown as road distance).
  function crowFlies(a, b) {
    const R = 6371000, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function normalise(raw, center, radius) {
    return raw
      .filter(p => p.location)
      .map(p => ({
        id: p.id,
        name: p.displayName || "Unnamed place",
        address: p.formattedAddress || "",
        lat: p.location.lat(),
        lng: p.location.lng()
      }))
      .filter(p => crowFlies(center, p) <= radius);
  }

  async function searchCategory(key, center, radius) {
    const cat = CATEGORIES[key];
    if (cat.query) return searchText(cat.query, center, radius);
    const { Place } = await google.maps.importLibrary("places");
    const { places } = await Place.searchNearby({
      fields: FIELDS,
      locationRestriction: { center, radius },
      includedTypes: cat.types,
      maxResultCount: 20
    });
    return normalise(places, center, radius);
  }

  async function searchText(query, center, radius) {
    const { Place } = await google.maps.importLibrary("places");
    const { places } = await Place.searchByText({
      textQuery: query,
      fields: FIELDS,
      locationBias: { center, radius },
      maxResultCount: 20
    });
    return normalise(places, center, radius);
  }

  // Turns a typed address into coordinates using Places Text Search.
  async function findAddress(text) {
    const { Place } = await google.maps.importLibrary("places");
    const { places } = await Place.searchByText({
      textQuery: text, fields: ["location", "formattedAddress", "displayName"], maxResultCount: 1
    });
    if (!places.length) return null;
    const p = places[0];
    return { lat: p.location.lat(), lng: p.location.lng(), label: p.formattedAddress || p.displayName || text };
  }

  return { CATEGORIES, searchCategory, searchText, findAddress };
})();
