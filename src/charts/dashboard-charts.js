import {
  METEOSWISS_FORECAST,
  METEOSWISS_STATION,
  SENSORS,
} from "../config.js";
import { numberOrNull } from "../domain/humidity.js";
import {
  colorWithAlpha,
  formatDateTime,
} from "../format.js";
import {
  buildTimeTicks,
  formatXAxisTick,
} from "../time-axis.js";
import { comfortBackgroundPlugin } from "./comfort-background.js";

export function createDashboardCharts(mobileLayoutMedia) {
  let temperatureChart = createLineChart("temperatureChart", "Temperature", "C");
  let humidityChart = createLineChart("humidityChart", "Humidity", "%");
  let comfortChart = createComfortChart();

  function createLineChart(canvasId, label, unit) {
    const grid = cssVar("--chart-grid");
    const muted = cssVar("--muted");

    return new Chart(document.getElementById(canvasId), {
      type: "line",
      data: { datasets: [] },
      options: {
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        plugins: {
          legend: {
            position: "bottom",
            onClick: handleLegendClick,
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              color: cssVar("--ink"),
            },
          },
          tooltip: {
            callbacks: {
              title: items => items.length
                ? formatDateTime(items[0].parsed.x)
                : "",
              label: item => (
                `${item.dataset.label}: ${item.parsed.y.toFixed(1)} ${unit}`
              ),
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            afterBuildTicks: scale => {
              scale.ticks = buildTimeTicks(
                scale.min,
                scale.max,
                mobileLayoutMedia.matches
              );
            },
            grid: { color: grid },
            ticks: {
              autoSkip: false,
              callback(value) {
                return formatXAxisTick(
                  value,
                  this.min,
                  this.max,
                  mobileLayoutMedia.matches
                );
              },
              color: muted,
            },
          },
          y: {
            position: "right",
            title: {
              display: true,
              text: `${label} (${unit})`,
              color: muted,
            },
            grid: { color: grid },
            ticks: { color: muted },
          },
        },
      },
    });
  }

  function createComfortChart() {
    const grid = cssVar("--chart-grid");
    const muted = cssVar("--muted");

    return new Chart(document.getElementById("comfortChart"), {
      type: "line",
      data: { datasets: [] },
      plugins: [comfortBackgroundPlugin],
      options: {
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        interaction: {
          axis: "xy",
          intersect: false,
          mode: "nearest",
        },
        plugins: {
          legend: {
            position: "bottom",
            onClick: handleLegendClick,
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              color: cssVar("--ink"),
            },
          },
          tooltip: { enabled: false },
        },
        scales: {
          x: {
            type: "linear",
            min: 22,
            max: 27,
            title: {
              display: true,
              text: "Temperature (C)",
              color: muted,
            },
            grid: { color: grid },
            ticks: {
              color: muted,
              maxTicksLimit: 10,
            },
          },
          y: {
            min: 0,
            max: 100,
            position: "right",
            title: {
              display: true,
              text: "Relative humidity (%)",
              color: muted,
            },
            grid: { color: grid },
            ticks: {
              color: muted,
              maxTicksLimit: 11,
            },
          },
        },
      },
    });
  }

  function updateLineChart(
    chart,
    sensorValueKey,
    unit,
    rows,
    meteoSwissRows,
    forecastRows
  ) {
    const allValues = [];

    chart.data.datasets = SENSORS.map(sensor => {
      const data = rows
        .map(row => ({
          x: row.timeMs,
          y: numberOrNull(row[sensor[sensorValueKey]]),
        }))
        .filter(point => point.y !== null);

      allValues.push(...data.map(point => point.y));

      return {
        label: sensor.name,
        data,
        borderColor: sensorChartColor(sensor),
        backgroundColor: sensorChartColor(sensor),
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.25,
      };
    });

    if (meteoSwissRows.length > 0) {
      const valueKey = chart === temperatureChart
        ? "temperatureC"
        : "humidityPct";
      const data = meteoSwissRows
        .map(row => ({ x: row.timeMs, y: row[valueKey] }))
        .filter(point => point.y !== null);

      if (data.length > 0) {
        allValues.push(...data.map(point => point.y));
        chart.data.datasets.push({
          label: METEOSWISS_STATION.label,
          data,
          borderColor: meteoSwissChartColor(),
          backgroundColor: meteoSwissChartColor(),
          borderDash: [6, 4],
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: true,
          tension: 0.25,
        });
      }
    }

    if (chart === temperatureChart && forecastRows.length > 0) {
      const data = forecastRows.map(row => ({
        x: row.timeMs,
        y: row.temperatureC,
      }));

      allValues.push(...data.map(point => point.y));
      chart.data.datasets.push({
        label: METEOSWISS_FORECAST.label,
        data,
        borderColor: forecastChartColor(),
        backgroundColor: forecastChartColor(),
        borderDash: [2, 5],
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: true,
        tension: 0.25,
      });
    }

    updateTimeXAxisRange(chart);
    chart.update();

    return allValues.length
      ? `${Math.min(...allValues).toFixed(1)}-${Math.max(...allValues).toFixed(1)} ${unit}`
      : "";
  }

  function updateComfortChart(rows) {
    comfortChart.data.datasets = SENSORS.map(sensor => {
      const data = downsampleTrajectory(
        rows
          .map(row => ({
            x: numberOrNull(row[sensor.temperatureKey]),
            y: numberOrNull(row[sensor.humidityKey]),
            timeMs: row.timeMs,
          }))
          .filter(point => point.x !== null && point.y !== null)
      );

      return {
        label: sensor.name,
        data,
        hidden: sensor.name === "Terrace",
        borderColor: sensorChartColor(sensor),
        backgroundColor: sensorChartColor(sensor),
        borderDash: sensor.name === "Terrace" ? [7, 4] : [],
        borderWidth: sensor.name === "Terrace" ? 1.5 : 2.25,
        pointBackgroundColor: sensorChartColor(sensor),
        pointBorderColor: cssVar("--panel"),
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointRadius: context => (
          context.dataIndex === context.dataset.data.length - 1 ? 4 : 0
        ),
        segment: {
          borderColor: context => colorWithAlpha(
            sensorChartColor(sensor),
            0.25 + 0.75 * context.p1DataIndex / Math.max(data.length - 1, 1)
          ),
        },
        spanGaps: true,
        tension: 0.2,
      };
    });

    updateComfortXAxisRange(comfortChart);
    comfortChart.update();
  }

  function applyTheme() {
    [temperatureChart, humidityChart, comfortChart].forEach(chart => {
      const ink = cssVar("--ink");
      const muted = cssVar("--muted");
      const grid = cssVar("--chart-grid");

      chart.options.plugins.legend.labels.color = ink;
      chart.options.scales.x.grid.color = grid;
      chart.options.scales.x.ticks.color = muted;
      chart.options.scales.y.grid.color = grid;
      chart.options.scales.y.ticks.color = muted;
      chart.options.scales.y.title.color = muted;
      chart.data.datasets.forEach(dataset => {
        const sensor = SENSORS.find(item => item.name === dataset.label);

        if (sensor) {
          const color = sensorChartColor(sensor);
          dataset.borderColor = color;
          dataset.backgroundColor = color;
          dataset.pointBackgroundColor = color;
          dataset.pointBorderColor = cssVar("--panel");
        }

        if (dataset.label === METEOSWISS_STATION.label) {
          const color = meteoSwissChartColor();
          dataset.borderColor = color;
          dataset.backgroundColor = color;
        }

        if (dataset.label === METEOSWISS_FORECAST.label) {
          const color = forecastChartColor();
          dataset.borderColor = color;
          dataset.backgroundColor = color;
        }
      });
      chart.update();
    });
  }

  function applyViewport() {
    const isMobile = mobileLayoutMedia.matches;

    [temperatureChart, humidityChart].forEach(chart => {
      chart.options.plugins.tooltip.enabled = !isMobile;
      chart.options.scales.y.title.display = !isMobile;
    });

    comfortChart.options.scales.x.ticks.maxTicksLimit = isMobile ? 5 : 10;
    comfortChart.options.scales.y.ticks.maxTicksLimit = isMobile ? 6 : 11;
    comfortChart.options.scales.x.title.display = !isMobile;
    comfortChart.options.scales.y.title.display = !isMobile;

    [temperatureChart, humidityChart, comfortChart].forEach(chart => {
      const labels = chart.options.plugins.legend.labels;
      labels.boxWidth = isMobile ? 9 : 12;
      labels.boxHeight = isMobile ? 9 : 12;
      labels.padding = isMobile ? 8 : 10;
      labels.font = { size: isMobile ? 10 : 12 };
      chart.update("none");
    });
  }

  function handleLegendClick(event, legendItem, legend) {
    const chart = legend.chart;
    const datasetIndex = legendItem.datasetIndex;

    chart.setDatasetVisibility(
      datasetIndex,
      !chart.isDatasetVisible(datasetIndex)
    );

    if (chart === comfortChart) {
      updateComfortXAxisRange(chart);
    } else {
      updateTimeXAxisRange(chart);
    }

    chart.update();
  }

  function updateComfortXAxisRange(chart) {
    const temperatures = chart.data.datasets.flatMap((dataset, index) => (
      chart.isDatasetVisible(index)
        ? dataset.data
          .map(point => numberOrNull(point.x))
          .filter(value => value !== null)
        : []
    ));

    chart.options.scales.x.min = temperatures.length > 0
      ? Math.min(22, Math.floor(Math.min(...temperatures)))
      : 22;
    chart.options.scales.x.max = temperatures.length > 0
      ? Math.max(27, Math.ceil(Math.max(...temperatures)))
      : 27;
  }

  function updateTimeXAxisRange(chart) {
    const halfHourMs = 30 * 60 * 1000;
    let earliest = Infinity;
    let latest = -Infinity;

    chart.data.datasets.forEach((dataset, index) => {
      if (!chart.isDatasetVisible(index)) {
        return;
      }

      dataset.data.forEach(point => {
        const time = Number(point.x);

        if (Number.isFinite(time)) {
          earliest = Math.min(earliest, time);
          latest = Math.max(latest, time);
        }
      });
    });

    if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
      delete chart.options.scales.x.min;
      delete chart.options.scales.x.max;
      return;
    }

    const minimum = Math.floor(earliest / halfHourMs) * halfHourMs;
    let maximum = Math.ceil(latest / halfHourMs) * halfHourMs;

    if (maximum <= minimum) {
      maximum = minimum + halfHourMs;
    }

    chart.options.scales.x.min = minimum;
    chart.options.scales.x.max = maximum;
  }

  function destroy() {
    temperatureChart?.destroy();
    humidityChart?.destroy();
    comfortChart?.destroy();
    temperatureChart = null;
    humidityChart = null;
    comfortChart = null;
  }

  return {
    applyTheme,
    applyViewport,
    destroy,
    updateComfort: updateComfortChart,
    updateHumidity(rows, meteoSwissRows) {
      return updateLineChart(
        humidityChart,
        "humidityKey",
        "%",
        rows,
        meteoSwissRows,
        []
      );
    },
    updateTemperature(rows, meteoSwissRows, forecastRows) {
      return updateLineChart(
        temperatureChart,
        "temperatureKey",
        "C",
        rows,
        meteoSwissRows,
        forecastRows
      );
    },
  };
}

function downsampleTrajectory(points, maxPoints = 1800) {
  if (points.length <= maxPoints) {
    return points;
  }

  return Array.from({ length: maxPoints }, (_, index) => (
    points[Math.round(index * (points.length - 1) / (maxPoints - 1))]
  ));
}

function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function sensorChartColor(sensor) {
  return document.documentElement.dataset.theme === "dark"
    ? sensor.darkColor
    : sensor.color;
}

function meteoSwissChartColor() {
  return document.documentElement.dataset.theme === "dark"
    ? METEOSWISS_STATION.darkColor
    : METEOSWISS_STATION.color;
}

function forecastChartColor() {
  return document.documentElement.dataset.theme === "dark"
    ? METEOSWISS_FORECAST.darkColor
    : METEOSWISS_FORECAST.color;
}
