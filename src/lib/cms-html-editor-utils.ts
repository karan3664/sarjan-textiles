export const CMS_FONT_FAMILIES = [
  "Kumbh Sans",
  "Inter",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Raleway",
  "Nunito",
  "DM Sans",
  "Source Sans 3",
  "Oswald",
  "Playfair Display",
  "Merriweather",
  "Libre Baskerville",
  "Cormorant Garamond",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
  "Palatino Linotype",
] as const;

export const CMS_FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
  { label: "56px", value: "56px" },
  { label: "64px", value: "64px" },
] as const;

export function normalizeFontFamily(value: string) {
  return value.replace(/['"]/g, "").split(",")[0]?.trim() ?? "";
}

export function matchCmsFontFamily(computed: string) {
  const normalized = normalizeFontFamily(computed);
  if (!normalized) {
    return "";
  }
  return (
    CMS_FONT_FAMILIES.find(
      (font) =>
        normalized.toLowerCase().includes(font.toLowerCase()) ||
        font.toLowerCase().includes(normalized.toLowerCase()),
    ) ?? ""
  );
}

export function isSelectionWithinEditor(
  editor: HTMLElement | null,
  selection: Selection | null,
) {
  if (!editor || !selection?.anchorNode) {
    return false;
  }
  return editor.contains(selection.anchorNode);
}

export function buildGoogleFontsUrl() {
  const systemFonts = new Set([
    "Arial",
    "Helvetica",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Palatino Linotype",
  ]);
  const families = CMS_FONT_FAMILIES.filter((font) => !systemFonts.has(font))
    .map((font) => `${font.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}
