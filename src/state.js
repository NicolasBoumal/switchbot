export function createAppState() {
  return {
    rows: [],
    currentRangeDays: 1,
    charts: null,
    isAuthorized: false,
    hasTriedAutoSignIn: false,
    hasAutoLoadedInitialRange: false,
    meteoSwissRows: [],
    forecastRows: [],
    activeLoadId: 0,
  };
}
