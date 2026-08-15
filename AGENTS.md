# Repository guidance

- Read `OVERVIEW.md` before changing data-loading or chart behavior.
- MeteoSwiss Pully observation CSVs are multi-parameter responses:
  - 10-minute temperature: `tre200s0`
  - 10-minute relative humidity: `ure200s0`
  - Hourly temperature: `tre200h0`
  - Hourly relative humidity: `ure200h0`
- Temperature and humidity must reuse the same Pully download; do not add a separate humidity request.
- The local Morges forecast feed does not provide readily usable humidity. Keep forecasts temperature-only unless explicitly requested otherwise.
