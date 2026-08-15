import {
  buildTimeTicks,
  formatXAxisTime,
  timeTickInterval,
} from "../src/time-axis.js";
import { assert, assertEquals } from "./test-helpers.js";

Deno.test("time tick ladder follows desktop and phone schedules", () => {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  assertEquals(timeTickInterval(24 * hour, false).step, 3);
  assertEquals(timeTickInterval(48 * hour, true).step, 12);
  assertEquals(timeTickInterval(7 * day, false).step, 1);
  assertEquals(timeTickInterval(30 * day, true).step, 7);
});

Deno.test("sub-day ticks align to local clock boundaries", () => {
  const start = new Date(2026, 7, 15, 10, 30).getTime();
  const ticks = buildTimeTicks(start, start + 24 * 60 * 60 * 1000, false);

  assert(ticks.length > 0);
  assert(ticks.every(tick => {
    const date = new Date(tick.value);
    return date.getMinutes() === 0 && date.getHours() % 3 === 0;
  }));
});

Deno.test("axis times use compact special labels", () => {
  const at = (hour, minute = 0) => new Date(2026, 0, 1, hour, minute).getTime();

  assertEquals(formatXAxisTime(at(0)), "midnight");
  assertEquals(formatXAxisTime(at(6)), "6 am");
  assertEquals(formatXAxisTime(at(12)), "noon");
  assertEquals(formatXAxisTime(at(18)), "6 pm");
});
