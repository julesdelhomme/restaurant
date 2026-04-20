import type { HungerLevelsConfig } from "./managerRuntimeShared";

export type ManagerReportArchiveFolderKey = "financial" | "stats" | "reviews";

export type CookingTranslationKey = "rare" | "medium_rare" | "medium" | "well_done";

export type AllergenLibraryRow = {
  id: string;
  name_fr: string;
  names_i18n: Record<string, string>;
};

export type FormulaStepEntry = {
  title: string;
  options: string[];
  auto_notify: boolean;
  destination: "cuisine" | "bar";
};

export interface Restaurant {
  id?: string | number;
  name?: string;
  address?: string | null;
  owner_id?: string | null;
  first_login?: boolean | null;
  otp_enabled?: boolean | null;
  logo_url?: string;
  banner_image_url?: string | null;
  banner_url?: string | null;
  background_url?: string;
  background_image_url?: string | null;
  welcome_popup_enabled?: boolean | null;
  welcome_popup_type?: "text" | "image" | string | null;
  welcome_popup_content_text?: string | null;
  welcome_popup_image_url?: string | null;
  google_review_url?: string | null;
  primary_color?: string;
  text_color?: string | null;
  card_bg_color?: string | null;
  custom_tags?: string[];
  table_config?: Record<string, unknown> | string | null;
  settings?: Record<string, unknown> | string | null;
  font_family?: string | null;
  card_density?: string | null;
  density_style?: string | null;
  bg_opacity?: number | null;
  menu_layout?: string | null;
  card_layout?: Record<string, unknown> | string | null;
  custom_legal_notice?: string | null;
  card_style?: string | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  email_subject?: string | null;
  email_body_header?: string | null;
  email_footer?: string | null;
}

export interface SuggestionRule {
  from_category_id: string;
  to_category_id: string;
}

export interface Dish {
  id?: number;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  description?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  description_de?: string | null;
  price: number;
  category_id?: string | number | null;
  subcategory_id?: string | number | null;
  categorie: string;
  sub_category?: string | null;
  image_url?: string | null;
  hunger_level?: string | null;
  hunger_levels?: Record<string, unknown> | string | null;
  custom_card_layout?: Record<string, unknown> | string | null;
  allergens?: string | null;
  dish_on_promo?: boolean | null;
  dish_is_vegetarian?: boolean | null;
  dish_is_spicy?: boolean | null;
  dish_is_new?: boolean | null;
  suggestion_message?: string | null;
  is_available?: boolean;
  active?: boolean;
  has_sides?: boolean;
  has_extras?: boolean;
  allow_multi_select?: boolean | null;
  ask_cooking?: boolean;
  selected_sides?: Array<string | number> | null;
  max_options?: number | null;
  is_featured?: boolean | null;
  is_special?: boolean | null;
  is_chef_suggestion?: boolean | null;
  is_daily_special?: boolean | null;
  is_promo?: boolean | null;
  is_alcohol?: boolean | null;
  promo_price?: number | null;
  formula_price?: number | null;
  is_suggestion?: boolean | null;
  is_formula?: boolean | null;
  formula_category_ids?: Array<string | number> | null;
  only_in_formula?: boolean | null;
  available_days?: string[] | string | null;
  start_time?: string | null;
  end_time?: string | null;
  product_options?: ProductOptionItem[];
  extras?: unknown;
  extras_list?: unknown;
  formula_config?: unknown;
}

export interface ProductOptionItem {
  id: string;
  product_id?: string;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  names_i18n?: Record<string, string>;
  price_override: number | null;
}

export type DishRecord = Record<string, unknown> & Dish;

export interface Order {
  id: string | number;
  created_at: string;
  updated_at?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
  finished_at?: string | null;
  ended_at?: string | null;
  items?: any;
  total?: number;
  total_price?: number;
  tip_amount?: number | null;
  tips?: number | null;
  status?: string;
  table_number?: string | number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  people_count?: number | null;
  payment_method?: string | null;
  payment_mode?: string | null;
  payment_type?: string | null;
  mode_paiement?: string | null;
}

export interface TableAssignment {
  id?: string | number;
  table_number?: string | number | null;
  pin_code?: string | null;
  status?: string | null;
  payment_status?: string | null;
  occupied?: boolean | null;
}

export interface Stats {
  total: number;
  totalTips: number;
  todayRevenue: number;
  todayTips: number;
  weekRevenue: number;
  weekTips: number;
  todayOrdersCount: number;
  averageBasket: number;
  topDishes: Array<{ name: string; count: number }>;
  weekByDay: Array<{ day: string; count: number }>;
}

export type ReviewRow = {
  id: string;
  order_id?: string | null;
  dish_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
  dish?: {
    id?: string | number | null;
    name?: string | null;
    name_fr?: string | null;
    image_url?: string | null;
  } | null;
};

export interface ExtrasItem {
  id: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  names_i18n?: Record<string, string>;
  price: number;
}

export interface SideLibraryItem {
  id: number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  category_id?: string | null;
}

export interface CategoryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  destination?: string | null;
  sort_order?: number | null;
}

export interface SubCategoryItem {
  id: string | number;
  category_id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
}

export interface DishForm {
  name_fr: string;
  name_en: string;
  name_es: string;
  name_de: string;
  name_i18n: Record<string, string>;
  description_fr: string;
  description_en: string;
  description_es: string;
  description_de: string;
  description_i18n: Record<string, string>;
  price: string;
  formula_price: string;
  available_days: string[];
  start_time: string;
  end_time: string;
  category_id: string;
  subcategory_id: string;
  hunger_level: string;
  hunger_levels: HungerLevelsConfig;
  image_url: string;
  calories: string;
  allergens: string;
  has_sides: boolean;
  has_extras: boolean;
  allow_multi_select: boolean;
  ask_cooking: boolean;
  is_vegetarian_badge: boolean;
  is_spicy_badge: boolean;
  is_new_badge: boolean;
  is_gluten_free_badge: boolean;
  is_chef_suggestion: boolean;
  is_daily_special: boolean;
  is_promo: boolean;
  is_alcohol: boolean;
  promo_price: string;
  is_suggestion: boolean;
  is_active: boolean;
  is_formula: boolean;
  is_formula_active: boolean;
  formula_category_ids: string[];
  formula_dish_ids: string[];
  formula_default_option_ids: Record<string, string[]>;
  formula_config: Record<string, unknown> | null;
  formula_sequence_by_dish: Record<string, number>;
  formula_name: string;
  formula_name_i18n: Record<string, string>;
  formula_image_url: string;
  formula_description: string;
  formula_description_i18n: Record<string, string>;
  formula_calories: string;
  formula_allergens: string[];
  only_in_formula: boolean;
  linked_formula_ids: string[];
  max_options: string;
  selected_side_ids: Array<string | number>;
  extras_list: ExtrasItem[];
  product_options: ProductOptionItem[];
  sales_tip: string;
  sales_tip_i18n: Record<string, string>;
  sales_tip_dish_id: string;
}

export interface DishExtraDraftForm {
  name_fr: string;
  name_en: string;
  name_es: string;
  name_de: string;
  names_i18n: Record<string, string>;
  price: string;
}
