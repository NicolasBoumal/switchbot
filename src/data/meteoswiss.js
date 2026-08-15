import {
  METEOSWISS_FORECAST,
  METEOSWISS_STATION,
} from "../config.js";
import { numberOrNull } from "../domain/humidity.js";

export async function loadMeteoSwissReadings(days, toMs) {
  const fromMs = toMs - days * 24 * 60 * 60 * 1000;
  const source = days === 1
    ? METEOSWISS_STATION.tenMinute
    : METEOSWISS_STATION.hourly;

  const texts = await Promise.all(
    source.urls.map(async url => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Could not load ${METEOSWISS_STATION.label} data: HTTP ${response.status}.`
        );
      }

      return response.text();
    })
  );

  const readingsByTime = new Map();

  texts.flatMap(parseCsv)
    .filter(row => row.station_abbr === METEOSWISS_STATION.station)
    .forEach(row => {
      const timeMs = parseMeteoSwissTimestamp(row.reference_timestamp);
      const temperatureC = numberOrNull(row[source.temperatureKey]);
      const humidityPct = numberOrNull(row[source.humidityKey]);

      if (
        Number.isFinite(timeMs) &&
        timeMs >= fromMs &&
        timeMs <= toMs &&
        (temperatureC !== null || humidityPct !== null)
      ) {
        readingsByTime.set(timeMs, { timeMs, temperatureC, humidityPct });
      }
    });

  return Array.from(readingsByTime.values())
    .sort((a, b) => a.timeMs - b.timeMs);
}

export async function loadMeteoSwissForecast(fromMs, toMs) {
  const assetUrl = await findLatestForecastAssetUrl();
  const response = await fetch(assetUrl);

  if (!response.ok) {
    throw new Error(
      `Could not load ${METEOSWISS_FORECAST.label} data: HTTP ${response.status}.`
    );
  }

  const rowsByTime = new Map();

  parseCsv(await response.text())
    .filter(row =>
      row.point_id === METEOSWISS_FORECAST.pointId &&
      row.point_type_id === METEOSWISS_FORECAST.pointTypeId
    )
    .forEach(row => {
      const timeMs = parseCompactUtcTimestamp(row.Date);
      const temperatureC = numberOrNull(
        row[METEOSWISS_FORECAST.temperatureKey]
      );

      if (
        Number.isFinite(timeMs) &&
        timeMs >= fromMs &&
        timeMs <= toMs &&
        temperatureC !== null
      ) {
        rowsByTime.set(timeMs, { timeMs, temperatureC });
      }
    });

  return Array.from(rowsByTime.values())
    .sort((a, b) => a.timeMs - b.timeMs);
}

async function findLatestForecastAssetUrl() {
  const today = new Date();
  const candidateItemIds = [
    formatCompactUtcDate(today),
    formatCompactUtcDate(new Date(today.getTime() - 24 * 60 * 60 * 1000)),
  ];

  for (const itemId of candidateItemIds) {
    const response = await fetch(
      `${METEOSWISS_FORECAST.collectionUrl}/${itemId}-ch`
    );

    if (!response.ok) {
      continue;
    }

    const item = await response.json();
    const asset = Object.entries(item.assets ?? {})
      .filter(([name]) => name.endsWith(
        `.${METEOSWISS_FORECAST.temperatureKey}.csv`
      ))
      .sort(([a], [b]) => b.localeCompare(a))
      .at(0);

    if (asset) {
      return asset[1].href;
    }
  }

  throw new Error(`Could not find ${METEOSWISS_FORECAST.label} data.`);
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(";");

  return lines.slice(1).map(line => {
    const values = line.split(";");

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    );
  });
}

export function parseMeteoSwissTimestamp(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return NaN;
  }

  const [, day, month, year, hour, minute] = match.map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function parseCompactUtcTimestamp(value) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(value);

  if (!match) {
    return NaN;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function formatCompactUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}
