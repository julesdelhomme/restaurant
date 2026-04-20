import type { ReactNode } from "react";

export type Order = {
  id: string;
  table_number: number;
  items: unknown;
  status: string;
  created_at: string;
  service_step?: string | null;
  current_step?: number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
};

export type ServiceNotification = {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  table_number?: string | number | null;
  restaurant_id?: string | number | null;
  created_at?: string | null;
  payload?: unknown;
  request_type?: string | null;
  request_key?: string | null;
};

export type TableAssignment = {
  id?: number;
  table_number: number;
  pin_code?: string | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  status?: string | null;
  payment_status?: string | null;
  occupied?: boolean | null;
};

export type CategoryItem = {
  id: string | number;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  name?: string | null;
  label?: string | null;
  category?: string | null;
  destination?: string | null;
};

export type DishItem = {
  id: string | number;
  name?: string | null;
  nom?: string | null;
  image_url?: string | null;
  formulaImage?: string | null;
  description?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  description_de?: string | null;
  name_fr?: string | null;
  formulaName?: string | null;
  category_id?: string | number | null;
  category?: string | null;
  categorie?: string | null;
  price?: number | string | null;
  formula_price?: number | string | null;
  formulaPrice?: number | null;
  is_formula?: boolean | null;
  formula_config?: unknown;
  formula_visible?: boolean | null;
  formula_supplements?: unknown;
  formula_category_ids?: Array<string | number> | string | null;
  active?: boolean | null;
  has_sides?: boolean | null;
  max_options?: number | null;
  selected_sides?: unknown;
  sides?: unknown;
  ask_cooking?: boolean | null;
  extras?: unknown;
  supplement?: unknown;
  supplements?: unknown;
  options?: unknown;
  selected_options?: unknown;
  dish_options?: unknown;
  formulaDisplayMode?: "base" | "formula";
  formula_base_dish_id?: string;
  excluded_main_options?: unknown;
};

export type SideLibraryItem = {
  id: string | number;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
};

export type ExtraChoice = {
  name: string;
  price: number;
};

export type ProductOptionChoice = {
  id: string;
  name: string;
  price: number;
  required: boolean;
};

export type FormulaSelection = {
  categoryId: string;
  categoryLabel: string;
  dishId: string;
  dishName: string;
  destination?: "cuisine" | "bar";
  sequence?: number | null;
  selectedSideIds?: string[];
  selectedSides?: string[];
  selectedCooking?: string;
  selectedOptionIds?: string[];
  selectedOptions?: Array<{
    id?: string | null;
    name?: string | null;
    price?: number;
  }>;
  selectedOptionNames?: string[];
  selectedOptionPrice?: number;
  supplements?: Array<{
    name?: string | null;
    price?: number;
  }>;
  selectedExtras?: ExtraChoice[];
};

export type FormulaSelectionDetails = {
  selectedSideIds: string[];
  selectedSides: string[];
  selectedCooking: string;
  selectedProductOptionIds: string[];
  selectedExtras: ExtraChoice[];
};

export type FormulaDishLink = {
  formulaDishId: string;
  dishId: string;
  sequence: number | null;
  step?: number | null;
  isMain?: boolean;
  defaultProductOptionIds?: string[];
  formulaName?: string;
  formulaImageUrl?: string;
};

export type FormulaDisplay = {
  id: string;
  dishId?: string;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
  calories?: number;
  formulaLinks: FormulaDishLink[];
};

export type FormulaSummary = {
  id: string;
  dish_id?: string | null;
  name: string;
  price: number | null;
  image_url?: string | null;
  description?: string | null;
  calories?: number | null;
  formula_config?: unknown;
  formula_visible?: boolean | null;
  formula_supplements?: unknown;
};

export type FastOrderLine = {
  lineId: string;
  dishId: string;
  dishName: string;
  category: string;
  categoryId: string | number | null;
  destination?: "cuisine" | "bar";
  quantity: number;
  unitPrice: number;
  selectedSides: string[];
  selectedExtras: ExtraChoice[];
  selectedProductOptionId: string | null;
  selectedProductOptionName: string | null;
  selectedProductOptionPrice: number;
  selectedCooking: string;
  specialRequest: string;
  isDrink: boolean;
  isFormula?: boolean;
  formulaDishId?: string;
  formulaDishName?: string;
  formulaUnitPrice?: number;
  formulaSelections?: FormulaSelection[];
};

export type FormulaConfigModalProps = {
  isOpen: boolean;
  allDishes: DishItem[];
  selectedFormula: DishItem | null;
  children: ReactNode;
};

export interface ParsedDishOptions {
  sideIds: Array<string | number>;
  extrasList: ExtraChoice[];
  askCooking: boolean;
}
