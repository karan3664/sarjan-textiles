import raw from "@/data/india-states-cities.json";

type IndiaStatesFile = {
  states: Array<{ name: string; cities: string[] }>;
};

const file = raw as IndiaStatesFile;

const STATE_CITY_MAP: Record<string, string[]> = {};
const CITY_TO_STATE = new Map<string, string>();

for (const entry of file.states) {
  const state = entry.name.trim();
  const cities = Array.from(
    new Set(
      entry.cities
        .map((city) => city.trim())
        .filter(Boolean)
        .filter((city) => city.length <= 80),
    ),
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  STATE_CITY_MAP[state] = cities;
  for (const city of cities) {
    const key = city.toLowerCase();
    if (!CITY_TO_STATE.has(key)) CITY_TO_STATE.set(key, state);
  }
}

export const INDIAN_STATES = Object.keys(STATE_CITY_MAP).sort((a, b) =>
  a.localeCompare(b, "en", { sensitivity: "base" }),
);

export function listCitiesForState(state: string) {
  return STATE_CITY_MAP[state] ?? [];
}

export function findStateForCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) return "";
  return CITY_TO_STATE.get(trimmed.toLowerCase()) ?? "";
}

export function isValidStateCityPair(state: string, city: string) {
  if (!state.trim() || !city.trim()) return false;
  return listCitiesForState(state).some(
    (item) => item.toLowerCase() === city.trim().toLowerCase(),
  );
}
