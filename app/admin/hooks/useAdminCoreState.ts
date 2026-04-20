import { useState } from "react";
import type { CategoryItem, DishItem, FormulaDisplay, FormulaSummary, Order, ServiceNotification, SideLibraryItem, TableAssignment } from "../types";

export function useAdminCoreState() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceNotifications, setServiceNotifications] = useState<ServiceNotification[]>([]);
  const [activeTables, setActiveTables] = useState<TableAssignment[]>([]);
  const [activeDishNames, setActiveDishNames] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"orders" | "sessions" | "new-order" | "service">("orders");

  const [tableNumberInput, setTableNumberInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [coversInput, setCoversInput] = useState("1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [disableClientOrderingEnabled, setDisableClientOrderingEnabled] = useState(false);
  const [totalTables, setTotalTables] = useState(0);
  const [restaurantSettingsError, setRestaurantSettingsError] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | number | null>(null);
  const [serverTableScopeEnabled, setServerTableScopeEnabled] = useState(false);
  const [serverAssignedTables, setServerAssignedTables] = useState<number[]>([]);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [isDishesLoading, setIsDishesLoading] = useState(true);
  const [formulas, setFormulas] = useState<FormulaSummary[]>([]);
  const [formulaDisplays, setFormulaDisplays] = useState<FormulaDisplay[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [dishIdsWithLinkedExtras, setDishIdsWithLinkedExtras] = useState<Set<string>>(new Set());
  const [tableNumbers, setTableNumbers] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFastTableNumber, setSelectedFastTableNumber] = useState("");

  return {
    orders,
    setOrders,
    serviceNotifications,
    setServiceNotifications,
    activeTables,
    setActiveTables,
    activeDishNames,
    setActiveDishNames,
    activeTab,
    setActiveTab,
    tableNumberInput,
    setTableNumberInput,
    pinInput,
    setPinInput,
    coversInput,
    setCoversInput,
    saving,
    setSaving,
    message,
    setMessage,
    settings,
    setSettings,
    disableClientOrderingEnabled,
    setDisableClientOrderingEnabled,
    totalTables,
    setTotalTables,
    restaurantSettingsError,
    setRestaurantSettingsError,
    restaurantId,
    setRestaurantId,
    serverTableScopeEnabled,
    setServerTableScopeEnabled,
    serverAssignedTables,
    setServerAssignedTables,
    categories,
    setCategories,
    dishes,
    setDishes,
    isDishesLoading,
    setIsDishesLoading,
    formulas,
    setFormulas,
    formulaDisplays,
    setFormulaDisplays,
    sidesLibrary,
    setSidesLibrary,
    dishIdsWithLinkedExtras,
    setDishIdsWithLinkedExtras,
    tableNumbers,
    setTableNumbers,
    selectedCategory,
    setSelectedCategory,
    selectedFastTableNumber,
    setSelectedFastTableNumber,
  };
}
