# Nearby Places Finder

A beginner-friendly web app that finds places near you (PGs, restaurants, hospitals, petrol bunks, pharmacies, ATMs and more) and shows real driving distance and time for each result. Built with plain HTML, CSS and JavaScript, no backend.

## Features
- Use your current location (browser Geolocation) or type an address/area
- 10 one-click categories plus free-text search ("women's PG", "laundry shops", "computer institutes")
- Result cards: name, address, road distance, driving time, Get directions button
- Distinct marker for your location, markers for each result, info window on click, card click focuses the map
- Radius selector: 1, 3, 5, 10 km (also drawn as a circle on the map)
- Sort by nearest distance or shortest travel time
- Friendly errors: permission denied, no results, offline, invalid key, quota exceeded, Places/Routes failures
- Responsive: list left and map right on desktop, stacked on mobile

## Technologies
HTML5, CSS3, vanilla JavaScript, Google Maps JavaScript API, Places API (New) (`Place.searchNearby`, `Place.searchByText`), Routes API (`computeRoutes`).

## Files
| File | Purpose |
|---|---|
| `index.html` | Page structure and script loading |
| `css/style.css` | Layout, colours, responsive rules |
| `js/config.js` | Your API key (git-ignored) |
| `js/config.example.js` | Safe template to copy to `config.js` |
| `js/map.js` | Loads Google Maps, markers, info window, radius circle |
| `js/places.js` | Categories, Nearby Search, Text Search, address lookup |
| `js/routes.js` | Routes API calls with caching and limited concurrency |
| `js/app.js` | UI logic, rendering, sorting, error messages |
| `.gitignore` | Keeps `js/config.js` out of Git |

## Google Maps Demo Key setup
1. Get a Google Maps Demo Key from Google's current Maps Demo documentation/console flow.
2. Open `js/config.js` and replace `PASTE_YOUR_GOOGLE_MAPS_DEMO_KEY_HERE` with your key.
3. If you cloned from GitHub, copy `js/config.example.js` to `js/config.js` first.
4. Never commit `config.js`. Remember: **browser keys can always be inspected by users and are not secret.** Restrict the key to your domains/APIs where Google allows it.

## Run with VS Code Live Server
1. Install the **Live Server** extension in VS Code.
2. Open the `NearbyPlacesFinder` folder.
3. Right-click `index.html` and choose **Open with Live Server** (it serves from `http://127.0.0.1:5500`).
4. Geolocation works on `localhost`/`127.0.0.1`; opening the file directly (`file://`) may block it.

## Testing checklist
- Click **Use my current location**, allow permission, then click **Restaurants**
- Deny permission once to confirm the friendly message appears
- Type "Indiranagar, Bengaluru" and press **Set location**
- Search "women's PG", change radius, change sorting
- Click a card (map focuses) and a marker (name appears)
- Put a wrong key in `config.js` to see the key error

## API limitations
- Demo Key capabilities, quotas and terms are set by Google and can change. Check the current Maps Demo Project Terms. If any API is not enabled for the Demo Key, the app shows an error instead of fake data.
- Nearby Search returns at most 20 places per request.
- Route times use `TRAFFIC_UNAWARE` (no live traffic), so they are estimates.
- One Routes call is made per result, so each search uses up to 20 route requests (results are cached in memory for the session).
- Place data is displayed live and not stored; do not cache or scrape Google place content beyond what Google's policies allow. Keep the Google logo/attribution visible on the map.
- Ratings, phone numbers and opening hours are intentionally not shown, because they are not requested.

## Screenshots
_Add screenshots here, e.g. `![Desktop view](screenshots/desktop.png)`_
