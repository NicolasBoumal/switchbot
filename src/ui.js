import { SENSORS } from "./config.js";
import { absoluteHumidityGm3 } from "./domain/humidity.js";
import { formatValue } from "./format.js";

export function createRangeButtons(container, ranges, selectedDays, onSelect) {
  return ranges.map(range => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", range.buttonText);
    button.setAttribute("aria-pressed", String(range.days === selectedDays));

    const desktopLabel = document.createElement("span");
    desktopLabel.className = "desktop-only";
    desktopLabel.textContent = range.buttonText;

    const mobileLabel = document.createElement("span");
    mobileLabel.className = "mobile-only";
    mobileLabel.textContent = range.shortButtonText;

    button.append(desktopLabel, mobileLabel);
    button.addEventListener("click", () => onSelect(range));
    container.append(button);
    return button;
  });
}

export function renderLatestReading(container, rows) {
  const latest = rows.at(-1);

  if (!latest) {
    container.innerHTML = "<p>No readings found.</p>";
    return;
  }

  const cells = SENSORS.map(sensor => `
    <tr>
      <td>${sensor.name}</td>
      <td>${formatValue(latest[sensor.temperatureKey], "C", 1)}</td>
      <td>${formatValue(latest[sensor.humidityKey], "%", 0)}</td>
      <td>${formatValue(
        absoluteHumidityGm3(
          latest[sensor.temperatureKey],
          latest[sensor.humidityKey]
        ),
        "g/m³",
        1
      )}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Sensor</th>
          <th><span class="desktop-only">Temperature</span><span class="mobile-only">C</span></th>
          <th><span class="desktop-only">Relative humidity</span><span class="mobile-only">RH</span></th>
          <th><span class="desktop-only">Absolute humidity</span><span class="mobile-only">g/m³</span></th>
        </tr>
      </thead>
      <tbody>${cells}</tbody>
    </table>
  `;
}
