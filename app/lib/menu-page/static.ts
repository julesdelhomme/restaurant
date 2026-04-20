import { AlertTriangle, CircleHelp, Droplets, Receipt, ShoppingCart, Trash2 } from "lucide-react";

export const FORMULA_BADGE_TRANSLATIONS: Record<string, string> = {
  fr: "En Formule",
  en: "In Formula",
  es: "En Menú",
  de: "Im Menü",
  it: "In Menù",
  pt: "No Menu",
  nl: "In Menu",
  ar: "في القائمة",
  zh: "套餐中",
  ja: "セット内",
  ru: "В меню",
  tr: "Menüde",
  pl: "W zestawie",
  ko: "세트메뉴",
};

export const VIEW_FORMULA_TRANSLATIONS: Record<string, string> = {
  fr: "Voir la formule",
  en: "View menu",
  es: "Ver el menú",
  de: "Menü ansehen",
  it: "Vedi il menù",
  pt: "Ver menu",
  nl: "Bekijk menu",
  ar: "عرض القائمة",
  zh: "查看套餐",
  ja: "セットを見る",
  ru: "Смотреть меню",
  tr: "Menüyü gör",
  pl: "Zobacz zestaw",
  ko: "세트 보기",
};

export const PROMO_BADGE_TRANSLATIONS: Record<string, string> = {
  fr: "PROMOTION",
  en: "PROMOTION",
  es: "PROMOCIÓN",
  de: "AKTION",
  it: "PROMOZIONE",
  pt: "PROMOÇÃO",
  nl: "PROMOTIE",
  ar: "عرض ترويجي",
  zh: "促销",
  ja: "プロモーション",
  ru: "АКЦИЯ",
  tr: "PROMOSYON",
  pl: "PROMOCJA",
  ko: "프로모션",
};

export type SmartCallOptionKey =
  | "help_question"
  | "ask_bill"
  | "need_water"
  | "need_bread"
  | "clear_table"
  | "report_problem"
  | "request_order";

export const SMART_CALL_OPTION_META: Array<{
  key: SmartCallOptionKey;
  icon: typeof CircleHelp;
  colorClass: string;
}> = [
  { key: "help_question", icon: CircleHelp, colorClass: "text-blue-600" },
  { key: "ask_bill", icon: Receipt, colorClass: "text-purple-600" },
  { key: "need_water", icon: Droplets, colorClass: "text-cyan-600" },
  { key: "need_bread", icon: CircleHelp, colorClass: "text-amber-600" },
  { key: "clear_table", icon: Trash2, colorClass: "text-gray-700" },
  { key: "report_problem", icon: AlertTriangle, colorClass: "text-red-600" },
  { key: "request_order", icon: ShoppingCart, colorClass: "text-emerald-600" },
];

export const SERVER_CALL_THROTTLE_MS = 60_000;
export const LAST_SERVER_CALL_STORAGE_KEY = "last_server_call";

export function getServerCallCooldownText(secondsLeft: number) {
  const safeSeconds = Math.max(1, Math.ceil(secondsLeft));
  return `Attendez ${safeSeconds}s`;
}

export const CATEGORY_KEYS = ["all", "entree", "plat", "dessert", "boisson"] as const;
export const FORMULAS_CATEGORY_ID = "__formulas__";
export const FORMULA_DIRECT_SEND_SEQUENCE = 4;
