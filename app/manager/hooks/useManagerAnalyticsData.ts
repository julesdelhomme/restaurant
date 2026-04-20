import { useMemo } from "react";
import type { Dish, Order } from "../types";

export function useManagerAnalyticsData(deps: Record<string, any>) {
  const orders = (Array.isArray(deps.orders) ? deps.orders : []) as Order[];
  const dishes = (Array.isArray(deps.dishes) ? deps.dishes : []) as Dish[];
  const analyticsRange = String(deps.analyticsRange || "7d");
  const categoryById = deps.categoryById as Map<string, any>;
  const analyticsText = (deps.analyticsText || {}) as Record<string, string>;
  const managerUiLang = String(deps.managerUiLang || "fr");
  const configuredTableNumbers = (Array.isArray(deps.configuredTableNumbers) ? deps.configuredTableNumbers : []) as number[];
  const parseObjectRecord = deps.parseObjectRecord as (value: unknown) => Record<string, unknown>;
  const restaurant = deps.restaurant;
  const parseTimeToMinutes = deps.parseTimeToMinutes as (value: unknown) => number | null;

  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeDays = analyticsRange === "today" ? 1 : analyticsRange === "7d" ? 7 : 30;
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
    const TABLE_SESSION_SETUP_OFFSET_MINUTES = 5;
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const managerLocale = managerUiLang === "es" ? "es-ES" : managerUiLang === "de" ? "de-DE" : "fr-FR";
    const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: localTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const hourMinuteFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: localTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayLabelFormatter = new Intl.DateTimeFormat(managerLocale, {
      timeZone: localTimezone,
      weekday: "long",
    });
    const shortDateFormatter = new Intl.DateTimeFormat(managerLocale, {
      timeZone: localTimezone,
      day: "2-digit",
      month: "2-digit",
    });

    const readItems = (order: Order) => {
      const raw = order.items;
      if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const normalizeText = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const readStatus = (order: Order) => normalizeText(order.status);

    const readOrderDateLocal = (order: Order) => {
      const rawValue = String(order.created_at || "").trim();
      if (!rawValue) return new Date(NaN);
      const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawValue);
      const utcValue = hasTimezone ? rawValue : `${rawValue}Z`;
      return new Date(utcValue);
    };

    const readOrderCloseDateLocal = (order: Order, fallbackDate?: Date) => {
      const candidates = [order.closed_at, order.updated_at, order.paid_at, order.finished_at, order.ended_at];
      for (const candidate of candidates) {
        const rawValue = String(candidate || "").trim();
        if (!rawValue) continue;
        const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawValue);
        const utcValue = hasTimezone ? rawValue : `${rawValue}Z`;
        const parsed = new Date(utcValue);
        if (Number.isFinite(parsed.getTime())) return parsed;
      }
      if (fallbackDate && Number.isFinite(fallbackDate.getTime())) return fallbackDate;
      return new Date(NaN);
    };

    const readOrderTotal = (order: Order) => {
      const total = Number(order.total_price);
      return Number.isFinite(total) ? total : 0;
    };
    const readOrderTip = (order: Order) => {
      const tip = Number(order.tip_amount ?? order.tips);
      return Number.isFinite(tip) ? tip : 0;
    };
    const readOrderCovers = (order: Order) => {
      const candidates = [
        order.covers,
        order.guest_count,
        order.customer_count,
        (order as Order & { people_count?: number | null; guests?: number | null; nb_personnes?: number | null }).people_count,
        (order as Order & { people_count?: number | null; guests?: number | null; nb_personnes?: number | null }).guests,
        (order as Order & { people_count?: number | null; guests?: number | null; nb_personnes?: number | null }).nb_personnes,
      ];
      for (const value of candidates) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return Math.trunc(n);
      }
      return 0;
    };

    const boolFromUnknown = (value: unknown) => value === true || String(value || "").toLowerCase() === "true";

    const normalizeCategory = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const getItemCategory = (item: Record<string, unknown>) => {
      const directLabel =
        String(item.category_name || item.category || item.categorie || item.category_label || "").trim();
      if (directLabel) return directLabel;
      const itemDish = (item.dish as any | undefined) || {};
      const nestedLabel = String(itemDish.category_name || itemDish.category || itemDish.categorie || "").trim();
      if (nestedLabel) return nestedLabel;
      const categoryId =
        item.category_id != null
          ? String(item.category_id)
          : itemDish.category_id != null
            ? String(itemDish.category_id)
            : "";
      if (!categoryId) return "";
      const category = categoryById.get(categoryId);
      return category?.name_fr || "";
    };

    const resolveMixKey = (categoryLabel: string) => {
      const normalized = normalizeCategory(categoryLabel);
      if (/(dessert|sucre|sweet)/.test(normalized)) return "desserts";
      if (/(boisson|drink|bar|beverage|cocktail|vin|wine|jus)/.test(normalized)) return "drinks";
      if (/(entree|starter|appetizer)/.test(normalized)) return "starters";
      return "mains";
    };

    const inRangeOrders = orders.filter((order) => {
      const date = readOrderDateLocal(order);
      return date >= rangeStart && date <= now;
    });
    const activeOrders = inRangeOrders.filter((order) => {
      const status = readStatus(order);
      return !["cancelled", "canceled", "annule", "annulee"].includes(status);
    });

    const paidOrders = inRangeOrders.filter((order) => readStatus(order) === "paid");
    const completedOrderStatuses = new Set([
      "paid",
      "paye",
      "payee",
      "resolved",
      "termine",
      "terminee",
      "finished",
      "done",
      "complete",
      "completed",
      "closed",
      "archive",
      "archived",
    ]);
    const completedOrders = inRangeOrders.filter((order) => completedOrderStatuses.has(readStatus(order)));

    const realRevenue = paidOrders.reduce((sum, order) => sum + readOrderTotal(order), 0);
    const totalTips = inRangeOrders.reduce((sum, order) => sum + readOrderTip(order), 0);
    const averageBasket = paidOrders.length > 0 ? realRevenue / paidOrders.length : 0;
    const completedRevenue = completedOrders.reduce((sum, order) => sum + readOrderTotal(order), 0);
    const totalCovers = activeOrders.reduce((sum, order) => sum + (parseInt(String(order.covers ?? ""), 10) || 0), 0);
    const totalOrders = activeOrders.length;
    const totalCoversServed = totalCovers;
    const totalServedTableSessionsWithCovers = totalOrders;
    const averageTicketPerCover = totalCoversServed > 0 ? completedRevenue / totalCoversServed : 0;
    const averageCoversPerTable = totalOrders > 0 ? Number((totalCovers / totalOrders).toFixed(1)) : 0;

    const productCountMap = new Map<string, number>();
    const productRevenueMap = new Map<string, number>();
    const productMix = { starters: 0, mains: 0, desserts: 0, drinks: 0 };
    let dessertOrdersCount = 0;
    let totalSoldItems = 0;
    let recommendedSoldItems = 0;
    let featuredSpecialSoldItems = 0;
    const dishesById = new Map(dishes.map((dish) => [String(dish.id ?? ""), dish]));

    paidOrders.forEach((order) => {
      const items = readItems(order);
      let hasDessert = false;
      items.forEach((item) => {
        const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
        const itemDish = (item.dish as any | undefined) || {};
        const itemId = String(item.id ?? itemDish.id ?? "");
        const sourceDish = itemId ? dishesById.get(itemId) : undefined;
        const isFormulaItem =
          boolFromUnknown(item.is_formula) ||
          boolFromUnknown(item.isFormula) ||
          item.formula_dish_id != null ||
          item.formulaDishId != null;
        const isFormulaChild = boolFromUnknown(item.is_formula_child) || boolFromUnknown(item.isFormulaChild);
        const formulaName =
          String(item.formula_dish_name || item.formulaDishName || item.formula_name || item.formulaName || "").trim();
        const saleName =
          (isFormulaItem && !isFormulaChild
            ? formulaName
            : String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim()) || "Produit";
        if (!(isFormulaItem && isFormulaChild)) {
          productCountMap.set(saleName, (productCountMap.get(saleName) || 0) + quantity);
        }
        const rawLineTotal = Number(item.line_total ?? item.total ?? item.total_price ?? NaN);
        const unitPrice = Number(item.price ?? itemDish.price ?? 0) || 0;
        const lineRevenue = Number.isFinite(rawLineTotal) && rawLineTotal > 0 ? rawLineTotal : unitPrice * quantity;
        if (!(isFormulaItem && isFormulaChild)) {
          productRevenueMap.set(saleName, (productRevenueMap.get(saleName) || 0) + lineRevenue);
        }
        const mixKey = resolveMixKey(getItemCategory(item));
        if (mixKey === "desserts") hasDessert = true;
        productMix[mixKey] += quantity;
        totalSoldItems += quantity;
        if (item.from_recommendation === true || String(item.from_recommendation || "").toLowerCase() === "true") {
          recommendedSoldItems += quantity;
        }
        if (
          boolFromUnknown(item.is_special) ||
          boolFromUnknown(item.is_featured) ||
          boolFromUnknown(item.is_daily_special) ||
          boolFromUnknown(item.is_chef_suggestion) ||
          boolFromUnknown(itemDish.is_special) ||
          boolFromUnknown(itemDish.is_featured) ||
          boolFromUnknown(itemDish.is_daily_special) ||
          boolFromUnknown(itemDish.is_chef_suggestion) ||
          boolFromUnknown((sourceDish as Dish & { is_special?: boolean | null } | undefined)?.is_special) ||
          boolFromUnknown(sourceDish?.is_featured) ||
          boolFromUnknown(sourceDish?.is_daily_special) ||
          boolFromUnknown(sourceDish?.is_chef_suggestion)
        ) {
          featuredSpecialSoldItems += quantity;
        }
      });
      if (hasDessert) dessertOrdersCount += 1;
    });

    const occupiedTablesSet = new Set<number>();
    const configuredTableSet = new Set<number>(configuredTableNumbers);
    const terminalOccupancyStatuses = new Set([
      "paid",
      "paye",
      "payee",
      "completed",
      "complete",
      "done",
      "finished",
      "termine",
      "terminee",
      "archived",
      "archive",
      "archivee",
      "cancelled",
      "canceled",
      "annule",
      "annulee",
      "free",
      "libre",
      "available",
      "closed",
    ]);
    orders.forEach((order) => {
      const status = readStatus(order);
      if (terminalOccupancyStatuses.has(status)) return;
      const tableNumber = Number(order.table_number);
      if (!Number.isFinite(tableNumber)) return;
      if (!configuredTableSet.has(tableNumber)) return;
      occupiedTablesSet.add(tableNumber);
    });
    const tableStateCounts = {
      free: configuredTableNumbers.filter((tableNumber) => !occupiedTablesSet.has(tableNumber)).length,
      occupied: occupiedTablesSet.size,
    };

    const tableRevenueMap = new Map<string, number>();
    paidOrders.forEach((order) => {
      const tableKeyRaw = order.table_number;
      const tableKey = String(tableKeyRaw ?? "").trim();
      const tableLabel = tableKey || "Sans table";
      tableRevenueMap.set(tableLabel, (tableRevenueMap.get(tableLabel) || 0) + readOrderTotal(order));
    });

    const top5 = [...productCountMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topRevenue5 = [...productRevenueMap.entries()]
      .map(([name, revenue]) => ({ name, revenue, count: productCountMap.get(name) || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const allProductNames = new Set<string>();
    dishes.forEach((dish) => {
      const name =
        String(
          (dish as unknown as any).name ||
            (dish as unknown as any).nom ||
            (dish as unknown as any).name_fr ||
            ""
        ).trim();
      if (name) allProductNames.add(name);
    });
    [...productCountMap.keys()].forEach((name) => allProductNames.add(name));
    [...productRevenueMap.keys()].forEach((name) => allProductNames.add(name));

    const allProductSales = [...allProductNames]
      .map((name) => ({
        name,
        count: productCountMap.get(name) || 0,
        revenue: productRevenueMap.get(name) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count || a.name.localeCompare(b.name));

    const closedStatuses = new Set(["paid", "paye", "payee", "resolved", "termine", "terminee", "finished", "done"]);
    const closedOrderDurationEntries = inRangeOrders
      .map((order) => {
        if (!closedStatuses.has(readStatus(order))) return null;
        const startDate = readOrderDateLocal(order);
        const closeDate = readOrderCloseDateLocal(order, now);
        if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(closeDate.getTime()) || closeDate < startDate) {
          return null;
        }
        const realDurationMinutes = (closeDate.getTime() - startDate.getTime()) / (1000 * 60);
        const durationMinutes = realDurationMinutes + TABLE_SESSION_SETUP_OFFSET_MINUTES;
        if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return null;
        return {
          startDate,
          dayKey: dateKeyFormatter.format(startDate),
          durationMinutes,
        };
      })
      .filter(
        (
          value
        ): value is {
          startDate: Date;
          dayKey: string;
          durationMinutes: number;
        } => value != null
      );
    const paidTableDurationsMinutes = closedOrderDurationEntries.map((entry) => entry.durationMinutes);

    const totalTablesCount = configuredTableNumbers.length;
    const occupancyIgnoredStatuses = new Set(["cancelled", "canceled", "annule", "annulee"]);
    const tableConfig = parseObjectRecord((restaurant as any)?.table_config);
    const settingsConfig = parseObjectRecord((restaurant as any)?.settings);
    const serviceConfig = { ...tableConfig, ...settingsConfig };
    const lunchStartMinutes = parseTimeToMinutes(serviceConfig.service_lunch_start ?? serviceConfig.lunch_start);
    const lunchEndMinutes = parseTimeToMinutes(serviceConfig.service_lunch_end ?? serviceConfig.lunch_end);
    const dinnerStartMinutes = parseTimeToMinutes(serviceConfig.service_dinner_start ?? serviceConfig.dinner_start);
    const dinnerEndMinutes = parseTimeToMinutes(serviceConfig.service_dinner_end ?? serviceConfig.dinner_end);
    const formatSlotLabel = (startMinutes: number, endMinutes: number) => {
      const format = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
      };
      return `${format(startMinutes)}-${format(endMinutes)}`;
    };
    const computedSlots: Array<{ id: string; label: string; startMinutes: number; endMinutes: number }> = [];
    if (lunchStartMinutes != null && lunchEndMinutes != null) {
      computedSlots.push({
        id: "lunch",
        label: formatSlotLabel(lunchStartMinutes, lunchEndMinutes),
        startMinutes: lunchStartMinutes,
        endMinutes: lunchEndMinutes,
      });
    }
    if (dinnerStartMinutes != null && dinnerEndMinutes != null) {
      computedSlots.push({
        id: "dinner",
        label: formatSlotLabel(dinnerStartMinutes, dinnerEndMinutes),
        startMinutes: dinnerStartMinutes,
        endMinutes: dinnerEndMinutes,
      });
    }
    const occupationSlotDefinitions =
      computedSlots.length > 0
        ? computedSlots
        : [
            { id: "lunch", label: "11h-14h", startMinutes: 11 * 60, endMinutes: 14 * 60 },
            { id: "dinner", label: "18h-22h", startMinutes: 18 * 60, endMinutes: 22 * 60 },
          ];
    const formatClockLabel = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };
    const buildServiceSlots = (stepMinutes: number) => {
      const slots: Array<{ label: string; startMinutes: number; endMinutes: number }> = [];
      occupationSlotDefinitions.forEach((slot) => {
        for (let minute = slot.startMinutes; minute < slot.endMinutes; minute += stepMinutes) {
          const slotStart = minute;
          const slotEnd = Math.min(slot.endMinutes, minute + stepMinutes);
          const label = stepMinutes === 60 ? formatSlotLabel(slotStart, slotEnd) : formatClockLabel(slotStart);
          slots.push({ label, startMinutes: slotStart, endMinutes: slotEnd });
        }
      });
      return slots;
    };
    const hourlyServiceSlots = buildServiceSlots(60);
    const halfHourServiceSlots = buildServiceSlots(30);
    const occupationSlotDayMap = new Map<string, Map<string, Set<number>>>();
    occupationSlotDefinitions.forEach((slot) => {
      const dayMap = new Map<string, Set<number>>();
      for (let offset = 0; offset < rangeDays; offset += 1) {
        const date = new Date(rangeStart);
        date.setDate(rangeStart.getDate() + offset);
        dayMap.set(dateKeyFormatter.format(date), new Set<number>());
      }
      occupationSlotDayMap.set(slot.id, dayMap);
    });
    inRangeOrders.forEach((order) => {
      const status = readStatus(order);
      if (occupancyIgnoredStatuses.has(status)) return;
      const tableNumber = Number(order.table_number);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;
      if (!configuredTableSet.has(tableNumber)) return;
      const date = readOrderDateLocal(order);
      if (!Number.isFinite(date.getTime())) return;
      const dayKey = dateKeyFormatter.format(date);
      const hm = hourMinuteFormatter.format(date);
      const [hourText, minuteText] = hm.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
      const orderMinutes = hour * 60 + minute;
      occupationSlotDefinitions.forEach((slot) => {
        if (orderMinutes < slot.startMinutes || orderMinutes >= slot.endMinutes) return;
        const slotDayMap = occupationSlotDayMap.get(slot.id);
        const tables = slotDayMap?.get(dayKey);
        if (!tables) return;
        tables.add(tableNumber);
      });
    });
    const occupationByTimeSlots = occupationSlotDefinitions.map((slot) => {
      const slotDays = occupationSlotDayMap.get(slot.id);
      const daySets = slotDays ? [...slotDays.values()] : [];
      const occupiedSum = daySets.reduce((sum, tables) => sum + tables.size, 0);
      const peakOccupiedTables = daySets.reduce((max, tables) => Math.max(max, tables.size), 0);
      const sampleDays = daySets.reduce((sum, tables) => sum + (tables.size > 0 ? 1 : 0), 0);
      const averageOccupiedTables = rangeDays > 0 ? occupiedSum / rangeDays : 0;
      const occupancyRate = totalTablesCount > 0 ? (averageOccupiedTables / totalTablesCount) * 100 : 0;
      return {
        id: slot.id,
        label: slot.label,
        occupancyRate,
        averageOccupiedTables,
        peakOccupiedTables,
        sampleDays,
      };
    });
    const averageOccupationRate =
      occupationByTimeSlots.length > 0
        ? occupationByTimeSlots.reduce((sum, slot) => sum + Number(slot.occupancyRate || 0), 0) / occupationByTimeSlots.length
        : 0;
    const averageTableDurationMinutes =
      paidTableDurationsMinutes.length > 0
        ? paidTableDurationsMinutes.reduce((sum, value) => sum + value, 0) / paidTableDurationsMinutes.length
        : 0;

    const getHourlyServiceSlot = (date: Date) => {
      const hm = hourMinuteFormatter.format(date);
      const [hourText, minuteText] = hm.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
      const orderMinutes = hour * 60 + minute;
      const match = hourlyServiceSlots.find(
        (slot) => orderMinutes >= slot.startMinutes && orderMinutes < slot.endMinutes
      );
      if (!match) return "";
      return match.label;
    };

    const toLocalDateFromKey = (key: string) => {
      const [year, month, day] = key.split("-").map((value) => Number(value));
      if (!year || !month || !day) return new Date(NaN);
      return new Date(year, month - 1, day);
    };

    const capitalizeLabel = (value: string) => {
      const text = String(value || "").trim();
      if (!text) return text;
      return text.charAt(0).toUpperCase() + text.slice(1);
    };

    let salesTrendData: Array<{ label: string; value: number }> = [];
    let orderTrendData: Array<{ label: string; value: number }> = [];
    let topProductsTimelineData: Array<{ label: string; value: number }> = [];
    let tablePerformanceTimelineData: Array<{ label: string; value: number; table: string }> = [];
    let dailyServicePerformanceData: Array<{
      label: string;
      dateLabel: string;
      revenue: number;
      orders: number;
      averageTableDurationMinutes: number;
    }> = [];
    let weeklyServicePerformanceData: Array<{
      label: string;
      periodLabel: string;
      revenue: number;
      orders: number;
      averageTableDurationMinutes: number;
    }> = [];
    let weeklyRangeSummary = {
      averageRevenuePerDay: 0,
      averageOrdersPerDay: 0,
      averageTableDurationMinutes: 0,
    };
    let salesTrendTitle: string = analyticsText.salesByHour;
    const topProductNames = new Set(top5.map((item) => item.name));
    const averageSalesByHourTitle =
      managerUiLang === "es"
        ? "Promedio de ventas por franja horaria"
        : managerUiLang === "de"
          ? "Durchschnittlicher Umsatz pro Zeitfenster"
          : "Moyenne des ventes par créneau horaire";
    const resolveWeekNumber = (sourceDate: Date) => {
      const dayKey = dateKeyFormatter.format(sourceDate);
      const localDate = toLocalDateFromKey(dayKey);
      const diffMs = localDate.getTime() - rangeStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays >= rangeDays) return null;
      return Math.floor(diffDays / 7) + 1;
    };

    const computeAverageHourlySales = () => {
      const slots = new Map<string, number>();
      const orderSlots = new Map<string, number>();
      hourlyServiceSlots.forEach((slot) => {
        slots.set(slot.label, 0);
        orderSlots.set(slot.label, 0);
      });
      if (hourlyServiceSlots.length === 0) {
        return { sales: [], orders: [] };
      }

      paidOrders.forEach((order) => {
        const date = readOrderDateLocal(order);
        const hm = hourMinuteFormatter.format(date);
        const [hourText, minuteText] = hm.split(":");
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
        const orderMinutes = hour * 60 + minute;
        const slot = hourlyServiceSlots.find(
          (entry) => orderMinutes >= entry.startMinutes && orderMinutes < entry.endMinutes
        );
        if (!slot) return;
        slots.set(slot.label, (slots.get(slot.label) || 0) + readOrderTotal(order));
        orderSlots.set(slot.label, (orderSlots.get(slot.label) || 0) + 1);
      });

      return {
        sales: [...slots.entries()].map(([label, total]) => ({
          label,
          value: rangeDays > 0 ? total / rangeDays : 0,
        })),
        orders: [...orderSlots.entries()].map(([label, total]) => ({
          label,
          value: rangeDays > 0 ? total / rangeDays : 0,
        })),
      };
    };

    if (analyticsRange === "today") {
      const slotMap = new Map<string, number>();
      const orderSlotMap = new Map<string, number>();
      halfHourServiceSlots.forEach((slot) => {
        slotMap.set(slot.label, 0);
        orderSlotMap.set(slot.label, 0);
      });

      paidOrders.forEach((order) => {
        const date = readOrderDateLocal(order);
        const hm = hourMinuteFormatter.format(date);
        const [hourText, minuteText] = hm.split(":");
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
        const orderMinutes = hour * 60 + minute;
        const slot = halfHourServiceSlots.find(
          (entry) => orderMinutes >= entry.startMinutes && orderMinutes < entry.endMinutes
        );
        if (!slot) return;
        slotMap.set(slot.label, (slotMap.get(slot.label) || 0) + readOrderTotal(order));
        orderSlotMap.set(slot.label, (orderSlotMap.get(slot.label) || 0) + 1);
      });

      salesTrendData = [...slotMap.entries()].map(([label, value]) => ({ label, value }));
      orderTrendData = [...orderSlotMap.entries()].map(([label, value]) => ({ label, value }));
      salesTrendTitle = analyticsText.salesByHour;
    } else if (analyticsRange === "7d") {
      const dayMap = new Map<string, number>();
      const dayOrdersMap = new Map<string, number>();
      const dayDurationMap = new Map<string, { total: number; count: number }>();
      const dayTopProductsMap = new Map<string, number>();
      const dayTableMap = new Map<string, Map<string, number>>();
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(rangeStart);
        date.setDate(rangeStart.getDate() + offset);
        const key = dateKeyFormatter.format(date);
        dayMap.set(key, 0);
        dayOrdersMap.set(key, 0);
        dayDurationMap.set(key, { total: 0, count: 0 });
        dayTopProductsMap.set(key, 0);
        dayTableMap.set(key, new Map<string, number>());
      }
      paidOrders.forEach((order) => {
        const key = dateKeyFormatter.format(readOrderDateLocal(order));
        if (!dayMap.has(key)) return;
        dayMap.set(key, (dayMap.get(key) || 0) + readOrderTotal(order));
        dayOrdersMap.set(key, (dayOrdersMap.get(key) || 0) + 1);

        const tableLabel = String(order.table_number ?? "").trim() || "Sans table";
        const tableTotals = dayTableMap.get(key);
        if (tableTotals) {
          tableTotals.set(tableLabel, (tableTotals.get(tableLabel) || 0) + readOrderTotal(order));
        }

        const items = readItems(order);
        let topItemsSold = 0;
        items.forEach((item) => {
          const itemDish = (item.dish as any | undefined) || {};
          const name =
            String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim() || "Produit";
          if (!topProductNames.has(name)) return;
          const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
          topItemsSold += quantity;
        });
        dayTopProductsMap.set(key, (dayTopProductsMap.get(key) || 0) + topItemsSold);
      });
      closedOrderDurationEntries.forEach((entry) => {
        if (!dayDurationMap.has(entry.dayKey)) return;
        const current = dayDurationMap.get(entry.dayKey) || { total: 0, count: 0 };
        dayDurationMap.set(entry.dayKey, {
          total: current.total + entry.durationMinutes,
          count: current.count + 1,
        });
      });
      dailyServicePerformanceData = [...dayMap.keys()].map((key) => {
        const localDate = toLocalDateFromKey(key);
        const weekdayLabel = capitalizeLabel(dayLabelFormatter.format(localDate));
        const dateLabel = `${weekdayLabel} ${shortDateFormatter.format(localDate)}`;
        const durationStats = dayDurationMap.get(key) || { total: 0, count: 0 };
        const averageDayDuration = durationStats.count > 0 ? durationStats.total / durationStats.count : 0;
        return {
          label: dateLabel,
          dateLabel,
          revenue: dayMap.get(key) || 0,
          orders: dayOrdersMap.get(key) || 0,
          averageTableDurationMinutes: averageDayDuration,
        };
      });
      const weeklyDurationStats = [...dayDurationMap.values()].reduce(
        (acc, row) => ({
          total: acc.total + row.total,
          count: acc.count + row.count,
        }),
        { total: 0, count: 0 }
      );
      weeklyRangeSummary = {
        averageRevenuePerDay:
          dailyServicePerformanceData.length > 0
            ? dailyServicePerformanceData.reduce((sum, row) => sum + row.revenue, 0) / dailyServicePerformanceData.length
            : 0,
        averageOrdersPerDay:
          dailyServicePerformanceData.length > 0
            ? dailyServicePerformanceData.reduce((sum, row) => sum + row.orders, 0) / dailyServicePerformanceData.length
            : 0,
        averageTableDurationMinutes:
          weeklyDurationStats.count > 0 ? weeklyDurationStats.total / weeklyDurationStats.count : 0,
      };
      const averageTrend = computeAverageHourlySales();
      salesTrendData = averageTrend.sales;
      orderTrendData = averageTrend.orders;
      topProductsTimelineData = [...dayMap.keys()].map((key) => ({
        label: capitalizeLabel(dayLabelFormatter.format(toLocalDateFromKey(key))),
        value: dayTopProductsMap.get(key) || 0,
      }));
      tablePerformanceTimelineData = [...dayMap.keys()].map((key) => {
        const tableTotals = dayTableMap.get(key) || new Map<string, number>();
        let bestTable = "-";
        let bestRevenue = 0;
        tableTotals.forEach((value, tableLabel) => {
          if (value > bestRevenue) {
            bestRevenue = value;
            bestTable = tableLabel;
          }
        });
        return {
          label: capitalizeLabel(dayLabelFormatter.format(toLocalDateFromKey(key))),
          value: bestRevenue,
          table: bestTable,
        };
      });
      salesTrendTitle = averageSalesByHourTitle;
    } else {
      const weeksCount = Math.ceil(rangeDays / 7);
      const weekMap = new Map<number, number>();
      const weekOrdersMap = new Map<number, number>();
      const weekDurationMap = new Map<number, { total: number; count: number }>();
      const weekTopProductsMap = new Map<number, number>();
      const weekTableMap = new Map<number, Map<string, number>>();
      for (let week = 1; week <= weeksCount; week += 1) {
        weekMap.set(week, 0);
        weekOrdersMap.set(week, 0);
        weekDurationMap.set(week, { total: 0, count: 0 });
        weekTopProductsMap.set(week, 0);
        weekTableMap.set(week, new Map<string, number>());
      }
      paidOrders.forEach((order) => {
        const weekNumber = resolveWeekNumber(readOrderDateLocal(order));
        if (!weekNumber || !weekMap.has(weekNumber)) return;
        weekMap.set(weekNumber, (weekMap.get(weekNumber) || 0) + readOrderTotal(order));
        weekOrdersMap.set(weekNumber, (weekOrdersMap.get(weekNumber) || 0) + 1);

        const tableLabel = String(order.table_number ?? "").trim() || "Sans table";
        const tableTotals = weekTableMap.get(weekNumber);
        if (tableTotals) {
          tableTotals.set(tableLabel, (tableTotals.get(tableLabel) || 0) + readOrderTotal(order));
        }

        const items = readItems(order);
        let topItemsSold = 0;
        items.forEach((item) => {
          const itemDish = (item.dish as any | undefined) || {};
          const name =
            String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim() || "Produit";
          if (!topProductNames.has(name)) return;
          const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
          topItemsSold += quantity;
        });
        weekTopProductsMap.set(weekNumber, (weekTopProductsMap.get(weekNumber) || 0) + topItemsSold);
      });
      closedOrderDurationEntries.forEach((entry) => {
        const weekNumber = resolveWeekNumber(entry.startDate);
        if (!weekNumber || !weekDurationMap.has(weekNumber)) return;
        const current = weekDurationMap.get(weekNumber) || { total: 0, count: 0 };
        weekDurationMap.set(weekNumber, {
          total: current.total + entry.durationMinutes,
          count: current.count + 1,
        });
      });
      const weekPrefix = managerUiLang === "es" ? "Semana" : managerUiLang === "de" ? "Woche" : "Semaine";
      weeklyServicePerformanceData = [...weekMap.keys()].map((weekNumber) => {
        const durationStats = weekDurationMap.get(weekNumber) || { total: 0, count: 0 };
        const averageWeekDuration = durationStats.count > 0 ? durationStats.total / durationStats.count : 0;
        const weekStartDate = new Date(rangeStart);
        weekStartDate.setDate(rangeStart.getDate() + (weekNumber - 1) * 7);
        const weekEndDate = new Date(rangeStart);
        weekEndDate.setDate(rangeStart.getDate() + Math.min(weekNumber * 7 - 1, rangeDays - 1));
        return {
          label: `${weekPrefix} ${weekNumber}`,
          periodLabel: `${shortDateFormatter.format(weekStartDate)} - ${shortDateFormatter.format(weekEndDate)}`,
          revenue: weekMap.get(weekNumber) || 0,
          orders: weekOrdersMap.get(weekNumber) || 0,
          averageTableDurationMinutes: averageWeekDuration,
        };
      });
      const averageTrend = computeAverageHourlySales();
      salesTrendData = averageTrend.sales;
      orderTrendData = averageTrend.orders;
      topProductsTimelineData = [...weekMap.keys()].map((weekNumber) => ({
        label: `${weekPrefix} ${weekNumber}`,
        value: weekTopProductsMap.get(weekNumber) || 0,
      }));
      tablePerformanceTimelineData = [...weekMap.keys()].map((weekNumber) => {
        const tableTotals = weekTableMap.get(weekNumber) || new Map<string, number>();
        let bestTable = "-";
        let bestRevenue = 0;
        tableTotals.forEach((value, tableLabel) => {
          if (value > bestRevenue) {
            bestRevenue = value;
            bestTable = tableLabel;
          }
        });
        return {
          label: `${weekPrefix} ${weekNumber}`,
          value: bestRevenue,
          table: bestTable,
        };
      });
      salesTrendTitle = averageSalesByHourTitle;
    }

    const hourlyRevenueMap = new Map<string, number>();
    const hourlyOrdersMap = new Map<string, number>();
    paidOrders.forEach((order) => {
      const slot = getHourlyServiceSlot(readOrderDateLocal(order));
      if (!slot) return;
      hourlyRevenueMap.set(slot, (hourlyRevenueMap.get(slot) || 0) + readOrderTotal(order));
      hourlyOrdersMap.set(slot, (hourlyOrdersMap.get(slot) || 0) + 1);
    });

    const bestRevenueSlot =
      salesTrendData.length > 0
        ? salesTrendData.reduce((best, current) => (current.value > best.value ? current : best), salesTrendData[0])
        : null;

    const peakOrdersEntries = [...hourlyOrdersMap.entries()].map(([label, value]) => ({ label, value }));
    const peakOrdersSlot =
      peakOrdersEntries.length > 0
        ? peakOrdersEntries.reduce((best, current) => (current.value > best.value ? current : best), peakOrdersEntries[0])
        : null;

    const avgRevenueSource =
      analyticsRange === "today"
        ? [...hourlyRevenueMap.values()]
        : salesTrendData.map((entry) => Number(entry.value || 0));
    const averageRevenuePerHour =
      avgRevenueSource.length > 0
        ? avgRevenueSource.reduce((sum, value) => sum + value, 0) / avgRevenueSource.length
        : 0;

    const recentOrderHistory = [...inRangeOrders]
      .sort((a, b) => readOrderDateLocal(b).getTime() - readOrderDateLocal(a).getTime())
      .slice(0, 20)
      .map((order) => ({
        id: String(order.id ?? ""),
        tableLabel: String(order.table_number ?? "").trim() || "Sans table",
        covers: readOrderCovers(order),
        total: readOrderTotal(order) + readOrderTip(order),
        orderTotal: readOrderTotal(order),
        tipAmount: readOrderTip(order),
        status: String(order.status || "").trim() || "-",
        createdAtLabel: Number.isFinite(readOrderDateLocal(order).getTime())
          ? readOrderDateLocal(order).toLocaleString("fr-FR")
          : "-",
      }));

    return {
      realRevenue,
      totalTips,
      averageBasket,
      totalCoversServed,
      totalServedTableSessionsWithCovers,
      averageTicketPerCover,
      averageCoversPerTable,
      top5,
      topRevenue5,
      allProductSales,
      productMixData: [
        { name: analyticsText.starters, value: productMix.starters },
        { name: analyticsText.mains, value: productMix.mains },
        { name: analyticsText.desserts, value: productMix.desserts },
        { name: analyticsText.drinks, value: productMix.drinks },
      ],
      tableStateData: [
        { name: analyticsText.freeTables, value: tableStateCounts.free },
        { name: analyticsText.occupiedTables, value: tableStateCounts.occupied },
      ],
      totalTables: tableStateCounts.free + tableStateCounts.occupied,
      tablePerformance: [...tableRevenueMap.entries()]
        .map(([table, revenue]) => ({ table, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      upsellRate: paidOrders.length > 0 ? (dessertOrdersCount / paidOrders.length) * 100 : 0,
      recommendationConversion: recommendedSoldItems,
      recommendationSoldItems: recommendedSoldItems,
      featuredSpecialSoldItems,
      averageTableDurationMinutes,
      averageOccupationRate,
      occupationByTimeSlots,
      salesTrendData,
      orderTrendData,
      salesTrendTitle,
      bestRevenueSlot,
      peakOrdersSlot,
      averageRevenuePerHour,
      topProductsTimelineData,
      tablePerformanceTimelineData,
      dailyServicePerformanceData,
      weeklyServicePerformanceData,
      weeklyRangeSummary,
      paidOrdersCount: paidOrders.length,
      recentOrderHistory,
    };
  }, [
    orders,
    dishes,
    analyticsRange,
    categoryById,
    analyticsText,
    managerUiLang,
    configuredTableNumbers,
  ]);



  return { analyticsData };
}
