export function assert(condition, message = "Assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals(actual, expected, message = "Values differ") {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: ${actual} !== ${expected}`);
  }
}

export function assertAlmostEquals(actual, expected, tolerance = 1e-3) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${actual} is not within ${tolerance} of ${expected}`);
  }
}
