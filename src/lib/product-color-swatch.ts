/** Map catalog color names to swatch fill colors. */
const NAMED_COLOR_HEX: Record<string, string> = {
  black: "#181818",
  indigo: "#2f3a6b",
  ivory: "#f2ebe0",
  mustard: "#d4a017",
  maroon: "#6b1f2a",
  blue: "#2f5f9e",
  peach: "#e8b89a",
  teal: "#1f7a7a",
  red: "#b42318",
  brown: "#6b4423",
  beige: "#d9c5a4",
  green: "#2f6b3f",
  navy: "#1c2d4f",
  grey: "#9ca3af",
  gray: "#9ca3af",
  white: "#f7f7f7",
  cream: "#f5f0e6",
  yellow: "#e5c04b",
  orange: "#d97706",
  pink: "#e8a0b4",
  purple: "#6b4c9a",
  gold: "#c9a227",
};

function hashColorHex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 42%)`;
}

export function productColorHex(color: string) {
  const key = color.trim().toLowerCase().replace(/\s+/g, " ");
  return NAMED_COLOR_HEX[key] ?? hashColorHex(key);
}
