export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: string;
  defaultTimezone: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  label: string;
  flag?: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
  countryCode?: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", defaultCurrency: "DOP", defaultTimezone: "America/Santo_Domingo" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", defaultCurrency: "USD", defaultTimezone: "America/New_York" },
  { code: "ES", name: "España", flag: "🇪🇸", defaultCurrency: "EUR", defaultTimezone: "Europe/Madrid" },
  { code: "MX", name: "México", flag: "🇲🇽", defaultCurrency: "MXN", defaultTimezone: "America/Mexico_City" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", defaultCurrency: "COP", defaultTimezone: "America/Bogota" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", defaultCurrency: "HNL", defaultTimezone: "America/Tegucigalpa" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", defaultCurrency: "GTQ", defaultTimezone: "America/Guatemala" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", defaultCurrency: "CRC", defaultTimezone: "America/Costa_Rica" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", defaultCurrency: "USD", defaultTimezone: "America/Panama" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", defaultCurrency: "USD", defaultTimezone: "America/El_Salvador" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", defaultCurrency: "NIO", defaultTimezone: "America/Managua" },
  { code: "PE", name: "Perú", flag: "🇵🇪", defaultCurrency: "PEN", defaultTimezone: "America/Lima" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", defaultCurrency: "ARS", defaultTimezone: "America/Argentina/Buenos_Aires" },
  { code: "CL", name: "Chile", flag: "🇨🇱", defaultCurrency: "CLP", defaultTimezone: "America/Santiago" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", defaultCurrency: "USD", defaultTimezone: "America/Guayaquil" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", defaultCurrency: "UYU", defaultTimezone: "America/Montevideo" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", defaultCurrency: "PYG", defaultTimezone: "America/Asuncion" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", defaultCurrency: "BOB", defaultTimezone: "America/La_Paz" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷", defaultCurrency: "USD", defaultTimezone: "America/Puerto_Rico" },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: "DOP", name: "Peso Dominicano", symbol: "RD$", label: "DOP — Peso Dominicano (RD$)", flag: "🇩🇴" },
  { code: "USD", name: "Dólar Estadounidense", symbol: "$", label: "USD — Dólar estadounidense ($)", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", label: "EUR — Euro (€)", flag: "🇪🇺" },
  { code: "MXN", name: "Peso Mexicano", symbol: "$", label: "MXN — Peso mexicano ($)", flag: "🇲🇽" },
  { code: "COP", name: "Peso Colombiano", symbol: "$", label: "COP — Peso colombiano ($)", flag: "🇨🇴" },
  { code: "HNL", name: "Lempira Hondureño", symbol: "L", label: "HNL — Lempira hondureño (L)", flag: "🇭🇳" },
  { code: "GTQ", name: "Quetzal Guatemalteco", symbol: "Q", label: "GTQ — Quetzal guatemalteco (Q)", flag: "🇬🇹" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/", label: "PEN — Sol peruano (S/)", flag: "🇵🇪" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", label: "ARS — Peso argentino ($)", flag: "🇦🇷" },
  { code: "CLP", name: "Peso Chileno", symbol: "$", label: "CLP — Peso chileno ($)", flag: "🇨🇱" },
  { code: "CRC", name: "Colón Costarricense", symbol: "₡", label: "CRC — Colón costarricense (₡)", flag: "🇨🇷" },
  { code: "NIO", name: "Córdoba Nicaragüense", symbol: "C$", label: "NIO — Córdoba nicaragüense (C$)", flag: "🇳🇮" },
  { code: "UYU", name: "Peso Uruguayo", symbol: "$", label: "UYU — Peso uruguayo ($)", flag: "🇺🇾" },
];

export const TIMEZONES: TimezoneOption[] = [
  { value: "America/Santo_Domingo", label: "República Dominicana (UTC-4 / Santo Domingo)", countryCode: "DO" },
  { value: "America/New_York", label: "Este EE.UU. / Miami / New York (UTC-5)", countryCode: "US" },
  { value: "America/Chicago", label: "Centro EE.UU. / Texas (UTC-6)", countryCode: "US" },
  { value: "America/Los_Angeles", label: "Pacífico EE.UU. / California (UTC-8)", countryCode: "US" },
  { value: "America/Mexico_City", label: "México Centro (UTC-6)", countryCode: "MX" },
  { value: "America/Bogota", label: "Colombia (UTC-5)", countryCode: "CO" },
  { value: "America/Lima", label: "Perú (UTC-5)", countryCode: "PE" },
  { value: "America/Tegucigalpa", label: "Honduras / Centroamérica (UTC-6)", countryCode: "HN" },
  { value: "America/Guatemala", label: "Guatemala (UTC-6)", countryCode: "GT" },
  { value: "America/Costa_Rica", label: "Costa Rica (UTC-6)", countryCode: "CR" },
  { value: "America/Panama", label: "Panamá (UTC-5)", countryCode: "PA" },
  { value: "America/El_Salvador", label: "El Salvador (UTC-6)", countryCode: "SV" },
  { value: "America/Managua", label: "Nicaragua (UTC-6)", countryCode: "NI" },
  { value: "America/Santiago", label: "Chile (UTC-3)", countryCode: "CL" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina / Buenos Aires (UTC-3)", countryCode: "AR" },
  { value: "America/Montevideo", label: "Uruguay (UTC-3)", countryCode: "UY" },
  { value: "America/Asuncion", label: "Paraguay (UTC-3)", countryCode: "PY" },
  { value: "America/La_Paz", label: "Bolivia (UTC-4)", countryCode: "BO" },
  { value: "America/Puerto_Rico", label: "Puerto Rico (UTC-4)", countryCode: "PR" },
  { value: "Europe/Madrid", label: "España / Madrid (UTC+1)", countryCode: "ES" },
  { value: "UTC", label: "Tiempo Universal Coordinado (UTC)" },
];

export function getCurrencySymbol(code: string): string {
  const found = CURRENCIES.find(c => c.code === code);
  return found ? found.symbol : code;
}

export function formatMoney(amount: number | string, currencyCode: string = "DOP"): string {
  const numeric = typeof amount === "number" ? amount : parseFloat(amount || "0");
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = Math.abs(numeric).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = numeric < 0 ? "-" : "";
  return `${prefix}${symbol} ${formatted}`;
}
