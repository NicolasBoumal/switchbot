export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function absoluteHumidityGm3(temperatureC, relativeHumidityPct) {
  const temperature = numberOrNull(temperatureC);
  const relativeHumidity = numberOrNull(relativeHumidityPct);

  if (
    temperature === null ||
    relativeHumidity === null ||
    temperature <= -243.12 ||
    relativeHumidity < 0 ||
    relativeHumidity > 100
  ) {
    return null;
  }

  const saturationVaporPressureHpa = 6.112 * Math.exp(
    17.62 * temperature / (243.12 + temperature)
  );
  const actualVaporPressureHpa = relativeHumidity / 100
    * saturationVaporPressureHpa;
  const absoluteHumidity = 216.7 * actualVaporPressureHpa
    / (273.15 + temperature);

  return Number.isFinite(absoluteHumidity) ? absoluteHumidity : null;
}
