import {
  absoluteHumidityGm3,
  numberOrNull,
} from "../src/domain/humidity.js";
import {
  assertAlmostEquals,
  assertEquals,
} from "./test-helpers.js";

Deno.test("numberOrNull normalizes numeric inputs", () => {
  assertEquals(numberOrNull("12.5"), 12.5);
  assertEquals(numberOrNull(""), null);
  assertEquals(numberOrNull(undefined), null);
  assertEquals(numberOrNull("not a number"), null);
});

Deno.test("absolute humidity matches the dashboard formula", () => {
  assertAlmostEquals(absoluteHumidityGm3(20, 50), 8.621, 0.002);
  assertEquals(absoluteHumidityGm3(20, 101), null);
});
