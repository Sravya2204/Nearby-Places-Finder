// routes.js - Google Maps JavaScript Routes library
const Routes = (() => {
  const cache = new Map();
  const key = (o, d) =>
    `${o.lat.toFixed(5)},${o.lng.toFixed(5)}>${d.id}`;

  class RouteError extends Error {
    constructor(message, code = "OTHER") {
      super(message);
      this.code = code;
    }
  }

  async function compute(origin, dest) {
    const k = key(origin, dest);

    if (cache.has(k)) return cache.get(k);

    try {
      // Load Google's Routes library
      const { Route } =
        await google.maps.importLibrary("routes");

      // Calculate the driving route
      const response = await Route.computeRoutes({
        origin: {
          lat: origin.lat,
          lng: origin.lng
        },
        destination: {
          lat: dest.lat,
          lng: dest.lng
        },
        travelMode: "DRIVING",
        routingPreference: "TRAFFIC_UNAWARE",
        fields: ["distanceMeters", "durationMillis"]
      });

      const route = response.routes?.[0];

      if (!route) {
        cache.set(k, null);
        return null;
      }

      const result = {
        meters: route.distanceMeters,
        seconds: Math.round(route.durationMillis / 1000)
      };

      cache.set(k, result);
      return result;

    } catch (e) {
      const message = e?.message || String(e);

      throw new RouteError(
        message,
        /quota|429|resource_exhausted/i.test(message)
          ? "QUOTA"
          : /denied|permission|api key|403|401/i.test(message)
            ? "AUTH"
            : "OTHER"
      );
    }
  }

  async function computeAll(
    apiKey,
    origin,
    places,
    onResult,
    concurrency = 4
  ) {
    let i = 0;
    let fatal = null;

    async function worker() {
      while (i < places.length) {
        const p = places[i++];

        try {
          const result = await compute(origin, p);
          onResult(p, result, null);
        } catch (e) {
          onResult(p, null, e);

          if (!fatal) fatal = e;

          if (e.code === "QUOTA" || e.code === "AUTH") {
            break;
          }
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, places.length) },
        () => worker()
      )
    );

    return fatal;
  }

  return { computeAll };
})();