# Application overview

## Purpose

This repository contains a single-page dashboard for viewing recent temperature and humidity history from three SwitchBot sensors. It also overlays nearby MeteoSwiss observations and forecasts on the temperature chart.

The app is designed to run directly in a browser as static files. There is no build step, package manager configuration, or local server implementation in this repository, but the app has important runtime dependencies on Firebase, a Cloudflare Worker, Chart.js, and MeteoSwiss services.

## Repository structure

- `index.html` — the entire user interface: HTML markup, CSS, application state, Firebase authentication, Firestore configuration lookup, Chart.js rendering, MeteoSwiss fetching/parsing, theming, and error/loading states.
- `switchbotapi.js` — a small ES module that configures and calls the Cloudflare Worker API used for SwitchBot devices and historical readings.
- `OVERVIEW.md` — this architectural reference.

## Runtime dependencies and services

All third-party JavaScript is loaded from CDNs in `index.html`:

- Chart.js renders the temperature and humidity line charts.
- Firebase 10.12.5 provides Google sign-in and Firestore access.

The app also depends on these external services:

- Firebase project `common-77900` for Google authentication and access configuration.
- Firestore document `secrets/switchbot`, which supplies the Cloudflare Worker URL through its `WORKERURL` field and the corresponding client credential through `CLIENTKEY` after sign-in.
- The Cloudflare Worker API from which SwitchBot readings are collected. Requests include `X-Client-Key` when a client key is configured.
- MeteoSwiss Open Government Data CSV/STAC endpoints for Pully observations and Morges forecasts.

Because the page uses an ES module, Firebase authentication, and cross-origin fetches, it should normally be served over HTTP(S), not opened as a `file://` URL.

## Application flow

1. An inline script applies the saved or system color theme before rendering, avoiding a light/dark flash.
2. The main module creates empty Chart.js charts and initializes Firebase.
3. Firebase attempts Google popup sign-in once automatically; the header also provides explicit sign-in and sign-out controls.
4. On authentication, the app reads `secrets/switchbot` from Firestore and passes the retrieved Cloudflare Worker URL and client key to `switchbotapi.js`.
5. The initial 24-hour range loads automatically. Users can instead request 24 hours, 7 days, or 30 days.
6. A range load fetches and renders SwitchBot history first. It then fetches MeteoSwiss observations and forecasts concurrently, updating the temperature chart as each source arrives.
7. MeteoSwiss failures are non-fatal: SwitchBot data remains displayed and the status notes that some weather data is unavailable. Other errors are shown in the latest-reading panel.

## Data model

SwitchBot history is expected as an object containing a `rows` array. Each row uses:

- `sampled_at_ms` — sample timestamp in Unix milliseconds.
- `terrace_temp_c` / `terrace_humidity_pct`.
- `kitchen_temp_c` / `kitchen_humidity_pct`.
- `bedroom_temp_c` / `bedroom_humidity_pct`.

`normalizeRow()` copies each row and converts `sampled_at_ms` to the internal numeric `timeMs` field. Sensor names, keys, and chart colors live in the `SENSORS` array in `index.html`.

MeteoSwiss observation rows are reduced to `{ timeMs, temperatureC, humidityPct }`, while forecast rows contain `{ timeMs, temperatureC }`. Observation timestamps are parsed from `DD.MM.YYYY HH:mm`; forecast timestamps use compact UTC `YYYYMMDDHHmm` values.

## Worker API client

`switchbotapi.js` keeps `workerBase` and `clientKey` as module-level configuration. It exports:

- `setWorkerBase()` and `setClientKey()`.
- `getDevices()` and `getDeviceStatus(deviceId)`.
- `getReadings({ from, to, limit })`.
- Convenience loaders for the last 24 hours, 7 days, 30 days, or an arbitrary number of days.

The dashboard currently uses only the history convenience loaders. API errors include HTTP status information and the parsed response body when possible.

## UI and state

The responsive page has a header, range toolbar, temperature time-series chart, humidity time-series chart, temperature-versus-humidity comfort chart, and latest-reading table. On screens up to 700 px wide, it uses compact range controls and chart legends, fewer axis ticks, shorter chart panels, and abbreviated table headings; the latest-reading panel moves ahead of the charts, and chart tooltips are disabled. The 24-hour range remains the initial and primary phone view. The comfort chart shows only the three SwitchBot trajectories and omits MeteoSwiss data. Its Terrace trajectory is dashed and hidden by default, but remains available through the legend; Terrace remains visible by default on the time-series charts. The comfort chart retains PMV contour lines but shades only the intersection of PMV -0.5 to +0.5 with a practical indoor relative-humidity range of 30-60%. Its PMV calculation assumes mean radiant temperature equals air temperature, air speed 0.1 m/s, activity 1.1 met, and clothing insulation 0.7 clo. The table shows temperature, measured relative humidity, and absolute humidity derived from those two measurements in g/m³. Styling and light/dark theme tokens are embedded in `index.html`; the selected theme is stored under `localStorage.switchbotTheme`.

Important in-memory state includes the loaded SwitchBot rows, MeteoSwiss observation/forecast rows, current range, authorization/loading flags, and the two Chart.js instances. Charts use linear millisecond x-axes and perform locale-aware date/time formatting without a Chart.js date adapter.

## Maintenance notes

- Adding or renaming a sensor requires updating the `SENSORS` configuration and ensuring the Worker response supplies the corresponding fields.
- Range limits are configured in `RANGES`: 2,000 rows for 24 hours, 12,000 for 7 days, and 45,000 for 30 days.
- Firebase client configuration is public by design, but access must remain protected by Firebase Authentication, Firestore security rules, and Worker-side validation of `X-Client-Key`.
- The CSV parser is deliberately simple: it assumes semicolon-delimited data with no quoted semicolons or embedded newlines.
- There are currently no automated tests, lint rules, build scripts, or deployment configuration in this repository.
