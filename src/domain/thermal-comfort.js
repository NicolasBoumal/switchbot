import { COMFORT_ASSUMPTIONS } from "../config.js";

export function comfortHumidityRange(temperature) {
  const dryPmv = estimatedPmv(temperature, 0);
  const humidPmv = estimatedPmv(temperature, 100);

  if (
    dryPmv === null ||
    humidPmv === null ||
    humidPmv < -0.5 ||
    dryPmv > 0.5
  ) {
    return null;
  }

  const pmvLower = dryPmv >= -0.5
    ? 0
    : humidityForPmv(temperature, -0.5);
  const pmvUpper = humidPmv <= 0.5
    ? 100
    : humidityForPmv(temperature, 0.5);

  if (pmvLower === null || pmvUpper === null) {
    return null;
  }

  const lower = Math.max(
    pmvLower,
    COMFORT_ASSUMPTIONS.minimumHumidityPct
  );
  const upper = Math.min(
    pmvUpper,
    COMFORT_ASSUMPTIONS.maximumHumidityPct
  );

  return lower <= upper ? { lower, upper } : null;
}

export function humidityForPmv(temperature, targetPmv) {
  let lower = 0;
  let upper = 100;
  const lowerPmv = estimatedPmv(temperature, lower);
  const upperPmv = estimatedPmv(temperature, upper);

  if (
    lowerPmv === null ||
    upperPmv === null ||
    targetPmv < lowerPmv ||
    targetPmv > upperPmv
  ) {
    return null;
  }

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const middle = (lower + upper) / 2;
    const middlePmv = estimatedPmv(temperature, middle);

    if (middlePmv < targetPmv) {
      lower = middle;
    } else {
      upper = middle;
    }
  }

  return (lower + upper) / 2;
}

export function estimatedPmv(temperature, relativeHumidity) {
  const radiantTemperature = temperature;
  const airSpeed = COMFORT_ASSUMPTIONS.airSpeedMs;
  const metabolicRate = COMFORT_ASSUMPTIONS.metabolicRateMet;
  const clothing = COMFORT_ASSUMPTIONS.clothingClo;
  const vaporPressure = relativeHumidity * 10
    * Math.exp(16.6536 - 4030.183 / (temperature + 235));
  const clothingInsulation = 0.155 * clothing;
  const metabolism = metabolicRate * 58.15;
  const internalHeat = metabolism;
  const clothingAreaFactor = clothingInsulation <= 0.078
    ? 1 + 1.29 * clothingInsulation
    : 1.05 + 0.645 * clothingInsulation;
  const forcedConvection = 12.1 * Math.sqrt(airSpeed);
  const airKelvin = temperature + 273;
  const radiantKelvin = radiantTemperature + 273;
  const initialClothingTemperature = airKelvin
    + (35.5 - temperature) / (3.5 * clothingInsulation + 0.1);
  const p1 = clothingInsulation * clothingAreaFactor;
  const p2 = p1 * 3.96;
  const p3 = p1 * 100;
  const p4 = p1 * airKelvin;
  const p5 = 308.7 - 0.028 * internalHeat
    + p2 * Math.pow(radiantKelvin / 100, 4);
  let clothingTemperature = initialClothingTemperature / 100;
  let previous = initialClothingTemperature / 50;
  let convection = forcedConvection;
  let iterations = 0;

  while (Math.abs(clothingTemperature - previous) > 0.00015) {
    previous = (previous + clothingTemperature) / 2;
    const naturalConvection = 2.38
      * Math.pow(Math.abs(100 * previous - airKelvin), 0.25);
    convection = Math.max(forcedConvection, naturalConvection);
    clothingTemperature = (
      p5 + p4 * convection - p2 * Math.pow(previous, 4)
    ) / (100 + p3 * convection);
    iterations += 1;

    if (iterations > 150) {
      return null;
    }
  }

  const clothingSurfaceC = 100 * clothingTemperature - 273;
  const skinDiffusion = 3.05 * 0.001
    * (5733 - 6.99 * internalHeat - vaporPressure);
  const sweating = internalHeat > 58.15
    ? 0.42 * (internalHeat - 58.15)
    : 0;
  const latentRespiration = 1.7 * 0.00001 * metabolism
    * (5867 - vaporPressure);
  const dryRespiration = 0.0014 * metabolism * (34 - temperature);
  const radiation = 3.96 * clothingAreaFactor * (
    Math.pow(clothingTemperature, 4)
    - Math.pow(radiantKelvin / 100, 4)
  );
  const convectionLoss = clothingAreaFactor * convection
    * (clothingSurfaceC - temperature);
  const thermalSensationTransfer = 0.303
    * Math.exp(-0.036 * metabolism) + 0.028;

  return thermalSensationTransfer * (
    internalHeat - skinDiffusion - sweating - latentRespiration
    - dryRespiration - radiation - convectionLoss
  );
}
