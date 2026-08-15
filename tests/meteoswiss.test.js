import {
  formatCompactUtcDate,
  parseCompactUtcTimestamp,
  parseCsv,
  parseMeteoSwissTimestamp,
} from "../src/data/meteoswiss.js";
import { assertEquals } from "./test-helpers.js";

Deno.test("MeteoSwiss CSV parsing preserves all parameter columns", () => {
  const rows = parseCsv(
    "station_abbr;tre200s0;ure200s0\nPUY;22.4;51\n"
  );

  assertEquals(rows.length, 1);
  assertEquals(rows[0].tre200s0, "22.4");
  assertEquals(rows[0].ure200s0, "51");
});

Deno.test("MeteoSwiss timestamps are parsed as UTC", () => {
  assertEquals(
    parseMeteoSwissTimestamp("15.08.2026 09:30"),
    Date.UTC(2026, 7, 15, 9, 30)
  );
  assertEquals(
    parseCompactUtcTimestamp("202608150930"),
    Date.UTC(2026, 7, 15, 9, 30)
  );
  assertEquals(formatCompactUtcDate(new Date(Date.UTC(2026, 7, 15))), "20260815");
});
