import {
  getReadingsLast24Hours,
  getReadingsLast7Days,
  getReadingsLast30Days,
  setClientKey,
  setWorkerBase,
} from "./src/data/switchbot.js";
import { createAuthClient } from "./src/auth.js";
import {
  loadMeteoSwissForecast,
  loadMeteoSwissReadings,
} from "./src/data/meteoswiss.js";
import {
  escapeHtml,
  formatTime,
} from "./src/format.js";
import { createDashboardCharts } from "./src/charts/dashboard-charts.js";
import { createRangeButtons, renderLatestReading } from "./src/ui.js";
import { createAppState } from "./src/state.js";

const RANGES = [
  {
    label: "last 24 hours",
    buttonText: "Load last 24 hours",
    shortButtonText: "24h",
    days: 1,
    loader: () => getReadingsLast24Hours({ limit: 2000 }),
  },
  {
    label: "last 7 days",
    buttonText: "Load last 7 days",
    shortButtonText: "7d",
    days: 7,
    loader: () => getReadingsLast7Days({ limit: 12000 }),
  },
  {
    label: "last 30 days",
    buttonText: "Load last 30 days",
    shortButtonText: "30d",
    days: 30,
    loader: () => getReadingsLast30Days({ limit: 45000 }),
  },
];

const rangeButtonsEl = document.getElementById("rangeButtons");
const themeButton = document.getElementById("themeButton");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const latestReadingEl = document.getElementById("latestReading");
const temperatureRangeEl = document.getElementById("temperatureRange");
const humidityRangeEl = document.getElementById("humidityRange");
const mobileLayoutMedia = window.matchMedia("(max-width: 700px)");

const state = createAppState();

initializeTheme();
const loadButtons = createRangeButtons(
  rangeButtonsEl,
  RANGES,
  state.currentRangeDays,
  range => loadHistory(range).catch(showError)
);
createCharts();
mobileLayoutMedia.addEventListener("change", applyChartViewport);
setLoading(true);
initializeFirebaseAuth();

function initializeTheme() {
  const storedTheme = getStoredTheme();
  const themeMedia = window.matchMedia?.("(prefers-color-scheme: dark)");
  const prefersDark = Boolean(themeMedia?.matches);
  const initialTheme = storedTheme || (prefersDark ? "dark" : "light");

  setTheme(initialTheme);

  themeButton.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark"
      ? "light"
      : "dark";

    storeTheme(nextTheme);
    setTheme(nextTheme);
  });

  themeMedia?.addEventListener("change", event => {
    if (getStoredTheme()) {
      return;
    }

    setTheme(event.matches ? "dark" : "light");
  });
}

function setTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeButton.textContent = isDark ? "Light" : "Dark";
  themeButton.setAttribute("aria-pressed", String(isDark));
  applyChartTheme();
}

function getStoredTheme() {
  try {
    return localStorage.getItem("switchbotTheme");
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("switchbotTheme", theme);
  } catch {
    // Theme persistence is nice to have; the toggle still works without it.
  }
}

function applyChartTheme() {
  state.charts?.applyTheme();
}

function initializeFirebaseAuth() {
  const authClient = createAuthClient();

  signInButton.addEventListener("click", () => {
    authClient.signIn().catch(showError);
  });

  signOutButton.addEventListener("click", () => {
    authClient.signOut().catch(showError);
  });

  authClient.onChange(user => {
    handleAuthState(user, authClient).catch(showError);
  });
}

async function handleAuthState(user, authClient) {
  state.activeLoadId += 1;
  setClientKey("");
  setWorkerBase("");
  state.isAuthorized = false;
  state.rows = [];
  state.meteoSwissRows = [];
  state.forecastRows = [];
  updateTemperatureChart();
  updateHumidityChart();
  updateComfortChart();
  renderLatestReading(latestReadingEl, state.rows);

  signInButton.hidden = Boolean(user);
  signOutButton.hidden = !user;

  if (!user) {
    summaryEl.textContent = "";
    state.hasAutoLoadedInitialRange = false;
    setStatus("Sign in to load readings");
    setLoading(true);
    tryAutoSignIn(authClient);
    return;
  }

  setStatus("Loading access...");
  const { clientKey, workerUrl } = await authClient.loadSwitchBotAccess();

  setClientKey(clientKey);
  setWorkerBase(workerUrl);
  state.isAuthorized = true;
  setStatus(`Signed in as ${user.email}`);
  setLoading(false);

  if (!state.hasAutoLoadedInitialRange) {
    state.hasAutoLoadedInitialRange = true;
    await loadHistory(RANGES[0]);
  }
}

function tryAutoSignIn(authClient) {
  if (state.hasTriedAutoSignIn) {
    return;
  }

  state.hasTriedAutoSignIn = true;
  setStatus("Opening sign-in...");

  authClient.signIn().catch(error => {
    if (
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request"
    ) {
      setStatus("Sign in to load readings");
      return;
    }

    if (error?.code === "auth/popup-blocked") {
      setStatus("Popup blocked. Use Sign in to load readings.");
      setLoading(false);
      return;
    }

    showError(error);
  });
}

async function loadHistory({ label, days, loader }) {
  if (!state.isAuthorized) {
    setStatus("Sign in to load readings");
    return;
  }

  setLoading(true);
  state.currentRangeDays = days;
  loadButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(RANGES[index].days === days));
  });
  setStatus(`Loading ${label}...`);

  const loadId = ++state.activeLoadId;
  const loadedAt = Date.now();
  const data = await loader();

  if (loadId !== state.activeLoadId) {
    return;
  }

  state.rows = (data.rows ?? [])
    .map(normalizeRow)
    .filter(row => Number.isFinite(row.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);

  // Show the fast device readings without waiting for either MeteoSwiss source.
  state.meteoSwissRows = [];
  state.forecastRows = [];
  updateTemperatureChart();
  updateHumidityChart();
  updateComfortChart();
  renderLatestReading(latestReadingEl, state.rows);

  const first = state.rows.at(0);
  const last = state.rows.at(-1);
  summaryEl.textContent = state.rows.length && first && last
    ? `${state.rows.length} readings from ${formatTime(first.timeMs)} to ${formatTime(last.timeMs)}`
    : "No readings found.";

  setStatus(`Device data updated ${formatTime(loadedAt)}; loading MeteoSwiss data...`);

  // Fetch both slower sources concurrently and add each result as soon as it arrives.
  const meteoSwissPromise = loadMeteoSwissReadings(days, loadedAt)
    .then(loadedRows => {
      if (loadId !== state.activeLoadId) {
        return null;
      }

      state.meteoSwissRows = loadedRows;
      updateTemperatureChart();
      updateHumidityChart();
      return null;
    })
    .catch(error => {
      if (loadId !== state.activeLoadId) {
        return null;
      }

      state.meteoSwissRows = [];
      console.warn(error);
      return error;
    });

  const forecastPromise = loadMeteoSwissForecast(
    loadedAt - 24 * 60 * 60 * 1000,
    loadedAt + days * 24 * 60 * 60 * 1000
  )
    .then(loadedRows => {
      if (loadId !== state.activeLoadId) {
        return null;
      }

      state.forecastRows = loadedRows;
      updateTemperatureChart();
      return null;
    })
    .catch(error => {
      if (loadId !== state.activeLoadId) {
        return null;
      }

      state.forecastRows = [];
      console.warn(error);
      return error;
    });

  const [meteoSwissError, forecastError] = await Promise.all([
    meteoSwissPromise,
    forecastPromise,
  ]);

  if (loadId !== state.activeLoadId) {
    return;
  }

  setStatus(
    meteoSwissError || forecastError
      ? `Updated ${formatTime(loadedAt)} (some MeteoSwiss data unavailable)`
      : `Updated ${formatTime(loadedAt)}`
  );
  setLoading(false);
}

function createCharts() {
  state.charts = createDashboardCharts(mobileLayoutMedia);
  applyChartTheme();
  applyChartViewport();
}

function applyChartViewport() {
  state.charts?.applyViewport();
}

function updateComfortChart() {
  state.charts?.updateComfort(state.rows);
}

function updateTemperatureChart() {
  temperatureRangeEl.textContent = state.charts?.updateTemperature(
    state.rows,
    state.meteoSwissRows,
    state.forecastRows
  ) ?? "";
}

function updateHumidityChart() {
  humidityRangeEl.textContent = state.charts?.updateHumidity(
    state.rows,
    state.meteoSwissRows
  ) ?? "";
}

function normalizeRow(row) {
  return {
    ...row,
    timeMs: Number(row.sampled_at_ms),
  };
}

function showError(error) {
  setStatus("Error");
  summaryEl.textContent = "";
  latestReadingEl.innerHTML = `<p class="error">${escapeHtml(error.stack || String(error))}</p>`;
  setLoading(false);
}

function setLoading(isLoading) {
  loadButtons.forEach(button => {
    button.disabled = isLoading;
  });
}

function setStatus(message) {
  statusEl.textContent = message;
}

window.addEventListener("beforeunload", () => {
  state.charts?.destroy();
});
