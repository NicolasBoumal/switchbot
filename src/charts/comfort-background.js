import { COMFORT_ASSUMPTIONS } from "../config.js";
import {
  comfortHumidityRange,
  humidityForPmv,
} from "../domain/thermal-comfort.js";

export const comfortBackgroundPlugin = {
  id: "comfortBackground",
  beforeDraw(chart) {
    drawComfortBackground(chart);
  },
};

function drawComfortBackground(chart) {
  const { ctx, chartArea, scales } = chart;

  if (!chartArea || !scales.x || !scales.y) {
    return;
  }

  const isDark = document.documentElement.dataset.theme === "dark";
  const contourColor = isDark
    ? "rgb(210 225 218 / 42%)"
    : "rgb(75 89 83 / 42%)";
  const comfortFill = isDark
    ? "rgb(65 170 105 / 15%)"
    : "rgb(65 170 105 / 11%)";

  ctx.save();
  ctx.beginPath();
  ctx.rect(
    chartArea.left,
    chartArea.top,
    chartArea.right - chartArea.left,
    chartArea.bottom - chartArea.top
  );
  ctx.clip();

  drawComfortBand(ctx, scales.x, scales.y, comfortFill);
  COMFORT_ASSUMPTIONS.contourLevels.forEach(level => {
    drawPmvContour(ctx, scales.x, scales.y, level, contourColor);
  });

  ctx.restore();
}

function drawComfortBand(ctx, xScale, yScale, fillStyle) {
  const segments = [];
  let segment = [];
  const samples = 160;

  for (let index = 0; index <= samples; index += 1) {
    const temperature = xScale.min
      + index / samples * (xScale.max - xScale.min);
    const range = comfortHumidityRange(temperature);

    if (range) {
      segment.push({
        x: xScale.getPixelForValue(temperature),
        lowerY: yScale.getPixelForValue(range.lower),
        upperY: yScale.getPixelForValue(range.upper),
      });
    } else if (segment.length > 0) {
      segments.push(segment);
      segment = [];
    }
  }

  if (segment.length > 0) {
    segments.push(segment);
  }

  ctx.fillStyle = fillStyle;
  segments.forEach(points => {
    if (points.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].upperY);
    points.slice(1).forEach(point => ctx.lineTo(point.x, point.upperY));
    points.slice().reverse().forEach(point => ctx.lineTo(point.x, point.lowerY));
    ctx.closePath();
    ctx.fill();
  });
}

function drawPmvContour(ctx, xScale, yScale, level, strokeStyle) {
  const segments = [];
  let segment = [];
  const samples = 200;

  for (let index = 0; index <= samples; index += 1) {
    const temperature = xScale.min
      + index / samples * (xScale.max - xScale.min);
    const humidity = humidityForPmv(temperature, level);

    if (humidity !== null) {
      segment.push({
        x: xScale.getPixelForValue(temperature),
        y: yScale.getPixelForValue(humidity),
      });
    } else if (segment.length > 0) {
      segments.push(segment);
      segment = [];
    }
  }

  if (segment.length > 0) {
    segments.push(segment);
  }

  segments.forEach(points => {
    if (points.length < 2) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = level === 0 ? 1.25 : 0.8;
    ctx.setLineDash(level === 0 ? [] : [3, 4]);
    ctx.stroke();

    const labelPoint = points[Math.floor(points.length / 2)];
    ctx.fillStyle = strokeStyle;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(formatPmvLevel(level), labelPoint.x + 4, labelPoint.y - 3);
  });

  ctx.setLineDash([]);
}

function formatPmvLevel(level) {
  return level > 0 ? `PMV +${level}` : `PMV ${level}`;
}
