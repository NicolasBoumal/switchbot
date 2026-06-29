let workerBase = "";
let clientKey = "";

export function setWorkerBase(value) {
  workerBase = String(value ?? "").replace(/\/+$/, "");
}

export function setClientKey(value) {
  clientKey = value ?? "";
}

async function workerGet(path) {
  if (!workerBase) {
    throw new Error("Missing Worker base URL.");
  }

  const headers = {};

  if (clientKey) {
    headers["X-Client-Key"] = clientKey;
  }

  const response = await fetch(workerBase + path, {
    method: "GET",
    headers,
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}\n` +
      JSON.stringify(data, null, 2)
    );
  }

  return data;
}

export function getDevices() {
  return workerGet("/devices");
}

export function getDeviceStatus(deviceId) {
  return workerGet(
    `/devices/${encodeURIComponent(deviceId)}/status`
  );
}

export function getReadings({ from, to, limit = 2000 }) {
  const params = new URLSearchParams({
    from: String(from),
    to: String(to),
    limit: String(limit),
  });

  return workerGet(`/readings?${params}`);
}

export function getReadingsLast24Hours({ limit = 2000 } = {}) {
  return getReadingsLastDays({ days: 1, limit });
}

export function getReadingsLast7Days({ limit = 12000 } = {}) {
  return getReadingsLastDays({ days: 7, limit });
}

export function getReadingsLast30Days({ limit = 45000 } = {}) {
  return getReadingsLastDays({ days: 30, limit });
}

export function getReadingsLastDays({ days, limit = 2000 }) {
  const to = Date.now();
  const from = to - days * 24 * 60 * 60 * 1000;

  return getReadings({ from, to, limit });
}
