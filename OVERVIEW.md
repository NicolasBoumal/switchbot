# Application overview

## Purpose

This repository contains a static, single-page dashboard for recent temperature
and humidity readings from three SwitchBot sensors. It also overlays nearby
MeteoSwiss Pully observations on both time-series charts and a temperature-only
Morges forecast on the temperature chart.

The project deliberately has no framework, build step, or package manager. It is
plain HTML, CSS, and browser ES modules, with Chart.js and Firebase loaded from
CDNs. Serve it over HTTP(S); do not rely on opening `index.html` as a `file://`
URL because browser modules, authentication, and cross-origin requests need an
HTTP origin.

## Source layout

- `index.html` — semantic page markup and third-party script loading only.
- `styles.css` — theme tokens, dashboard layout, and responsive phone styles.
- `main.js` — application coordinator: startup, authentication transitions,
  progressive source loading, state-to-view updates, and error/loading status.
- `src/state.js` — factory for the dashboard's mutable in-memory state.
- `src/config.js` — Firebase public configuration, sensor metadata, MeteoSwiss
  endpoints/fields, colors, and indoor-comfort assumptions.
- `src/auth.js` — Firebase initialization, Google sign-in, and validated loading
  of the SwitchBot Worker access settings from Firestore.
- `src/data/switchbot.js` — Cloudflare Worker client and history range helpers.
- `src/data/meteoswiss.js` — observation/forecast fetching and CSV/timestamp
  parsing.
- `src/charts/dashboard-charts.js` — owns all three Chart.js instances, datasets,
  legends, axis ranges/ticks, viewport behavior, and theme updates.
- `src/charts/comfort-background.js` — draws the PMV contours and shaded comfort
  region behind the temperature-versus-humidity trajectories.
- `src/domain/humidity.js` — numeric normalization and absolute-humidity math.
- `src/domain/thermal-comfort.js` — PMV calculation and comfort-band math.
- `src/time-axis.js` — time-axis bounds, tick schedules, and compact tick labels.
- `src/format.js` — display formatting and HTML escaping.
- `src/ui.js` — range-button and latest-reading-table rendering.
- `tests/` — Deno regression tests for the pure math, parsing, and axis logic.
- `AGENTS.md` — durable repository-specific guidance for future coding sessions.

Keep `main.js` focused on orchestration. Data-source details belong in
`src/data/`, Chart.js details in `src/charts/`, and independently testable
calculations in `src/domain/` or `src/time-axis.js`.

## Runtime dependencies and services

- Chart.js renders the three charts.
- Firebase 10.12.5 provides Google authentication and Firestore access.
- Firebase project `common-77900` authenticates users.
- Firestore document `secrets/switchbot` supplies `WORKERURL` and `CLIENTKEY`.
- The configured Cloudflare Worker returns SwitchBot history and receives the
  client key in the `X-Client-Key` header.
- MeteoSwiss Open Government Data CSV/STAC endpoints provide Pully observations
  and Morges forecasts.

Firebase client configuration is public by design. Actual access must remain
protected by Firebase Authentication, Firestore security rules, and Worker-side
validation of `X-Client-Key`.

## Loading flow

1. A small inline script applies the saved or system theme before rendering.
2. `main.js` creates the charts, UI controls, central state, and Firebase client.
3. Firebase attempts Google popup sign-in once; explicit sign-in/sign-out buttons
   remain available.
4. On authentication, `src/auth.js` reads and validates `secrets/switchbot`, and
   `main.js` configures the Worker client.
5. The 24-hour range loads automatically. Users can request 24 hours, 7 days, or
   30 days.
6. SwitchBot history is fetched and rendered first.
7. Pully observations and the Morges forecast start concurrently. Each source is
   added to the relevant charts immediately when it arrives; neither waits for
   the other.
8. A monotonically increasing load ID prevents late responses from an older range
   request from overwriting the current view.

MeteoSwiss failures are non-fatal: device data remains visible and the status
notes that some weather data is unavailable.

## Data contracts

SwitchBot history is an object containing a `rows` array. Each row uses:

- `sampled_at_ms` — Unix timestamp in milliseconds.
- `terrace_temp_c` / `terrace_humidity_pct`.
- `kitchen_temp_c` / `kitchen_humidity_pct`.
- `bedroom_temp_c` / `bedroom_humidity_pct`.

`normalizeRow()` in `main.js` adds numeric `timeMs` and the rows are sorted before
rendering.

One Pully observation download supplies both values. Parsed observations are
`{ timeMs, temperatureC, humidityPct }`; the important MeteoSwiss fields are:

- 10-minute temperature: `tre200s0`.
- 10-minute relative humidity: `ure200s0`.
- Hourly temperature: `tre200h0`.
- Hourly relative humidity: `ure200h0`.

Do not add another Pully request for humidity. Morges forecasts remain
temperature-only and produce `{ timeMs, temperatureC }` rows.

The CSV parser is intentionally small and assumes semicolon-delimited rows with
no quoted semicolons or embedded newlines.

## Chart behavior

The temperature and humidity charts use linear millisecond x-axes without a date
adapter. Their bounds cover all visible datasets, including forecast points, and
round outward to half-hour boundaries. Bounds and explicit ticks are recomputed
after data arrives and after legend toggles. Tick density follows the visible
span and phone layouts use sparser ticks. Labels use compact clock text, including
`midnight` and `noon`.

The temperature-versus-humidity chart includes only the three SwitchBot sensors.
The Terrace trajectory is dashed and hidden by default on this chart only. Its
temperature axis includes all visible sensor data with 2°C of padding on either
side and always contains 22–27°C; relative humidity stays fixed at 0–100%.
Tooltips are disabled for this chart.

The comfort background shades the intersection of PMV −0.5 to +0.5 and the
practical indoor relative-humidity range 30–60%. The PMV model assumes mean
radiant temperature equals air temperature, 0.1 m/s air speed, 1.1 met activity,
and 0.7 clo clothing. These values live in `COMFORT_ASSUMPTIONS`.

On screens up to 700 px wide, controls, legends, tables, and chart heights become
more compact; the latest-reading table moves ahead of the charts; time-series
tooltips are disabled; and the initial 24-hour view remains the primary view.

## Local checks

Quarto includes a Deno JavaScript runtime on this machine. It may not be on
`PATH`; the durable discovery details are recorded in `AGENTS.md`. With the
bundled executable, run:

```powershell
& 'C:\Users\nboumal\AppData\Local\Programs\Quarto\bin\tools\x86_64\deno.exe' test tests
& 'C:\Users\nboumal\AppData\Local\Programs\Quarto\bin\tools\x86_64\deno.exe' check src/charts/dashboard-charts.js src/ui.js src/state.js src/data/switchbot.js
```

The first command covers pure calculations and parsers. The second checks local
browser modules that do not require resolving Firebase's remote imports.
