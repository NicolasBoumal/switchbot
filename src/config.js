export const firebaseConfig = {
  apiKey: "AIzaSyBwLI4d70iDuAaf7fNwn0WX-kny01nmT5k",
  authDomain: "common-77900.firebaseapp.com",
  projectId: "common-77900",
  storageBucket: "common-77900.firebasestorage.app",
  messagingSenderId: "667782892801",
  appId: "1:667782892801:web:a30ef02706b7c385b51f00",
};

export const SENSORS = [
  {
    name: "Terrace",
    color: "#c43f2f",
    darkColor: "#ff776c",
    temperatureKey: "terrace_temp_c",
    humidityKey: "terrace_humidity_pct",
  },
  {
    name: "Kitchen",
    color: "#2374ab",
    darkColor: "#61bfff",
    temperatureKey: "kitchen_temp_c",
    humidityKey: "kitchen_humidity_pct",
  },
  {
    name: "Bedroom",
    color: "#238b45",
    darkColor: "#68df91",
    temperatureKey: "bedroom_temp_c",
    humidityKey: "bedroom_humidity_pct",
  },
];

export const METEOSWISS_STATION = {
  label: "MeteoSwiss Pully",
  station: "PUY",
  tenMinute: {
    urls: [
      "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/puy/ogd-smn_puy_t_recent.csv",
      "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/puy/ogd-smn_puy_t_now.csv",
    ],
    temperatureKey: "tre200s0",
    humidityKey: "ure200s0",
  },
  hourly: {
    urls: [
      "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/puy/ogd-smn_puy_h_recent.csv",
      "https://data.geo.admin.ch/ch.meteoschweiz.ogd-smn/puy/ogd-smn_puy_h_now.csv",
    ],
    temperatureKey: "tre200h0",
    humidityKey: "ure200h0",
  },
  color: "#6d5bd0",
  darkColor: "#c4b5ff",
};

export const METEOSWISS_FORECAST = {
  label: "MeteoSwiss forecast Morges",
  pointId: "10312",
  pointTypeId: "1",
  collectionUrl: "https://data.geo.admin.ch/api/stac/v1/collections/ch.meteoschweiz.ogd-local-forecasting/items",
  temperatureKey: "tre200h0",
  color: "#8b5a2b",
  darkColor: "#f5c16c",
};

export const COMFORT_ASSUMPTIONS = {
  airSpeedMs: 0.1,
  metabolicRateMet: 1.1,
  clothingClo: 0.7,
  minimumHumidityPct: 30,
  maximumHumidityPct: 60,
  contourLevels: [-1, -0.5, 0, 0.5, 1],
};
