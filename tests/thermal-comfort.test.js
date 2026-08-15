import {
  comfortHumidityRange,
  estimatedPmv,
} from "../src/domain/thermal-comfort.js";
import {
  assertAlmostEquals,
  assertEquals,
} from "./test-helpers.js";

Deno.test("PMV reference points remain stable", () => {
  assertAlmostEquals(estimatedPmv(20, 50), -1.201, 0.002);
  assertAlmostEquals(estimatedPmv(24, 50), -0.054, 0.002);
});

Deno.test("comfort shading intersects PMV with 30-60 percent RH", () => {
  assertEquals(comfortHumidityRange(22), null);
  const range = comfortHumidityRange(24);
  assertEquals(range.lower, 30);
  assertEquals(range.upper, 60);
});
