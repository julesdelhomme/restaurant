import type { Item, Order } from "./types";

type CreateKitchenCourseLogicArgs = {
  getOrderItems: (order: Order) => Item[];
  isKitchenCourse: (item: Item) => boolean;
  isItemReady: (item: Item) => boolean;
  getItemStatus: (item: Item) => "pending" | "preparing" | "ready";
  normalizeStepValue: (value: unknown, allowZero?: boolean) => number | null;
  normalizeEntityId: (value: unknown) => string;
  dishCategoryIdByDishId: Record<string, string>;
  categorySortOrderById: Record<string, number>;
  categoryNameById: Record<string, string>;
  normalizeServiceStep: (value: unknown) => string;
  resolveCourseFromSequence: (value: unknown) => string;
  resolveCourseFromLabel: (value: unknown) => string;
  isFormulaItem: (item: Item) => boolean;
  resolveFormulaSequenceForItem: (item: Item) => number | null;
  serviceStepSequence: readonly string[];
  serviceStepLabels: Record<string, string>;
};

export const createKitchenCourseLogic = ({
  getOrderItems,
  isKitchenCourse,
  isItemReady,
  getItemStatus,
  normalizeStepValue,
  normalizeEntityId,
  dishCategoryIdByDishId,
  categorySortOrderById,
  categoryNameById,
  normalizeServiceStep,
  resolveCourseFromSequence,
  resolveCourseFromLabel,
  isFormulaItem,
  resolveFormulaSequenceForItem,
  serviceStepSequence,
  serviceStepLabels,
}: CreateKitchenCourseLogicArgs) => {
  const resolveItemExplicitStep = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const candidates: unknown[] = [
      record.step,
      (item as { step?: unknown }).step,
      record.sequence,
      (item as { sequence?: unknown }).sequence,
      record.formula_current_sequence,
      record.formulaCurrentSequence,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeStepValue(candidate, true);
      if (normalized != null) return normalized;
    }
    return null;
  };

  const resolveServiceStepRank = (step: unknown) => {
    const normalized = normalizeServiceStep(step);
    const index = serviceStepSequence.indexOf(normalized);
    return index >= 0 ? index + 1 : Number.MAX_SAFE_INTEGER;
  };

  const resolveItemStepRank = (item: Item) => {
    const explicit = resolveItemExplicitStep(item);
    if (explicit != null && explicit > 0) return explicit;
    const formulaSequence = normalizeStepValue(resolveFormulaSequenceForItem(item));
    if (formulaSequence != null && formulaSequence > 0) return formulaSequence;
    return resolveServiceStepRank(resolveItemCourse(item));
  };

  const readItemSortOrder = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const candidate = Number(record.sort_order ?? record.sortOrder ?? record.position ?? record.index ?? NaN);
    return Number.isFinite(candidate) ? candidate : Number.MAX_SAFE_INTEGER;
  };

  const resolveItemCategorySortOrder = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const itemCategoryId = normalizeEntityId(
      record.category_id ??
        record.categoryId ??
        (record.dish && typeof record.dish === "object" ? (record.dish as Record<string, unknown>).category_id : null)
    );
    const dishId = normalizeEntityId(record.dish_id ?? record.id);
    const resolvedCategoryId = itemCategoryId || (dishId ? dishCategoryIdByDishId[dishId] || "" : "");
    if (!resolvedCategoryId) return null;
    const sortOrder = categorySortOrderById[resolvedCategoryId];
    return Number.isFinite(sortOrder) ? Number(sortOrder) : null;
  };

  const resolveItemCourse = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const sequenceCourse = resolveCourseFromSequence(resolveFormulaSequenceForItem(item));
    if (sequenceCourse) return sequenceCourse;
    const itemCategoryId = normalizeEntityId(
      record.category_id ??
        record.categoryId ??
        (record.dish && typeof record.dish === "object" ? (record.dish as Record<string, unknown>).category_id : null)
    );
    const dishId = normalizeEntityId(record.dish_id ?? record.id);
    const resolvedCategoryId = itemCategoryId || (dishId ? dishCategoryIdByDishId[dishId] || "" : "");
    const categoryLabel = resolvedCategoryId ? categoryNameById[resolvedCategoryId] || "" : "";
    const fallbackCategory = String(item.category || item.categorie || "").toLowerCase().trim();
    return resolveCourseFromLabel(categoryLabel || fallbackCategory);
  };

  const sortKitchenItemsByStep = (items: Item[]) =>
    [...items].sort((a, b) => {
      const stepDiff = resolveItemStepRank(a) - resolveItemStepRank(b);
      if (stepDiff !== 0) return stepDiff;
      const categoryDiff = (resolveItemCategorySortOrder(a) ?? Number.MAX_SAFE_INTEGER) - (resolveItemCategorySortOrder(b) ?? Number.MAX_SAFE_INTEGER);
      if (categoryDiff !== 0) return categoryDiff;
      const orderDiff = readItemSortOrder(a) - readItemSortOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return String((a as any).name_fr || a.name || "").localeCompare(String((b as any).name_fr || b.name || ""), "fr", {
        sensitivity: "base",
      });
    });

  const getKitchenItems = (order: Order) => {
    const items = getOrderItems(order)
      .filter((item) => isKitchenCourse(item))
      .filter((item) => {
        const status = getItemStatus(item);
        return status !== "ready";
      });
    false && console.log("TRACE:", {
      context: "kitchen.getKitchenItems",
      orderId: order.id,
      currentStep: order.current_step,
      serviceStep: order.service_step,
      rawCount: getOrderItems(order).length,
      kitchenCount: items.length,
      kitchenItems: items.map((item) => {
        const record = item as unknown as Record<string, unknown>;
        return {
          order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
          dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
          name: String((item as any).name_fr || item.name || "").trim() || null,
          stepRank: resolveItemStepRank(item),
          status: getItemStatus(item),
        };
      }),
    });
    return sortKitchenItemsByStep(items);
  };

  const getPendingKitchenItems = (order: Order) =>
    sortKitchenItemsByStep(
      getOrderItems(order)
        .filter((item) => isKitchenCourse(item))
        .filter((item) => !isItemReady(item))
    );

  const getKitchenItemsForServiceStep = (order: Order) => {
    const pendingItems = getPendingKitchenItems(order);
    if (pendingItems.length === 0) return pendingItems;
    const currentStep = resolveOrderCurrentStep(order, pendingItems);
    const normalizedCurrentStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
    const stepItems = pendingItems.filter((item) => resolveItemStepRank(item) === normalizedCurrentStep);
    false && console.log("TRACE:", {
      context: "kitchen.getKitchenItemsForServiceStep",
      orderId: order.id,
      persistedCurrentStep: order.current_step,
      resolvedCurrentStep: currentStep,
      normalizedCurrentStep,
      pendingItems: pendingItems.map((item) => {
        const record = item as unknown as Record<string, unknown>;
        return {
          order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
          dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
          name: String((item as any).name_fr || item.name || "").trim() || null,
          stepRank: resolveItemStepRank(item),
          status: getItemStatus(item),
        };
      }),
      shownItems: stepItems.map((item) => {
        const record = item as unknown as Record<string, unknown>;
        return {
          order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
          dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
          name: String((item as any).name_fr || item.name || "").trim() || null,
          stepRank: resolveItemStepRank(item),
          status: getItemStatus(item),
        };
      }),
    });
    return stepItems;
  };

  const getUpcomingKitchenItems = (order: Order) => {
    const pendingItems = getPendingKitchenItems(order);
    if (pendingItems.length === 0) return [];
    const currentStep = resolveOrderCurrentStep(order, pendingItems);
    const hasFollowUp = pendingItems.some((item) => {
      const step = resolveItemStepRank(item);
      return Number.isFinite(step) && step > currentStep;
    });
    if (!hasFollowUp) return [];
    const nextAvailableStep = pendingItems
      .map((item) => resolveItemStepRank(item))
      .filter((step): step is number => Number.isFinite(step) && step > currentStep)
      .sort((a, b) => a - b)[0];
    if (!Number.isFinite(nextAvailableStep)) return [];
    return pendingItems.filter((item) => resolveItemStepRank(item) === nextAvailableStep);
  };

  const hasPendingKitchenItems = (order: Order) => getKitchenItems(order).some((item) => !isItemReady(item));
  const hasPreparingOrReadyKitchenItems = (order: Order) => getKitchenItems(order).length > 0;
  const getServedOrReadyKitchenItems = (order: Order) =>
    sortKitchenItemsByStep(
      getOrderItems(order)
        .filter((item) => isKitchenCourse(item))
        .filter((item) => getItemStatus(item) === "ready")
    );

  const resolveOrderServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => isKitchenCourse(item) && !isItemReady(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.map((item) => resolveItemCourse(item)));
    const normalized = normalizeServiceStep(order.service_step);
    if (normalized && availableSteps.has(normalized)) return normalized;
    const fallback = serviceStepSequence.find((step) => availableSteps.has(step));
    return fallback || normalized || "";
  };

  const resolveOrderCurrentStep = (order: Order, items: Item[]) => {
    const direct = normalizeStepValue(
      (order as unknown as Record<string, unknown>).current_step ??
        (order as unknown as Record<string, unknown>).currentStep,
      true
    );
    if (direct != null) return direct > 0 ? direct : 1;
    const normalizedServiceStep = normalizeServiceStep(order.service_step);
    if (normalizedServiceStep === "entree") return 1;
    if (normalizedServiceStep === "plat") return 2;
    if (normalizedServiceStep === "dessert") return 3;
    const explicitSteps = items
      .map((item) => resolveItemExplicitStep(item))
      .filter((value): value is number => Number.isFinite(value));
    const positive = explicitSteps.filter((value) => value > 0);
    if (positive.length > 0) return Math.min(...positive);
    const fallbackStep = resolveOrderServiceStep(order, items);
    if (fallbackStep === "entree") return 1;
    if (fallbackStep === "plat") return 2;
    if (fallbackStep === "dessert") return 3;
    return 1;
  };

  const resolveServiceStepFromCurrentStep = (currentStep: number) => {
    if (currentStep >= 3) return "dessert";
    if (currentStep <= 1) return "entree";
    return "plat";
  };

  const resolveNextServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => isKitchenCourse(item) && !isItemReady(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.map((item) => resolveItemCourse(item)));
    const current = resolveOrderServiceStep(order, items);
    const startIndex = current ? serviceStepSequence.indexOf(current) : -1;
    const firstAvailable = serviceStepSequence.find((step) => availableSteps.has(step)) || "";
    if (startIndex < 0) return firstAvailable;
    for (let index = startIndex + 1; index < serviceStepSequence.length; index += 1) {
      const step = serviceStepSequence[index];
      if (availableSteps.has(step)) return step;
    }
    return "";
  };

  const resolveFormulaStepLabelForItem = (item: Item) => {
    const explicitStep = resolveItemExplicitStep(item);
    if (explicitStep != null && explicitStep > 0) return `ÉTAPE ${explicitStep}`;
    if (!isFormulaItem(item)) return "";
    const sequence = resolveFormulaSequenceForItem(item);
    if (Number.isFinite(sequence) && Number(sequence) > 0) {
      return `ÉTAPE ${Math.max(1, Math.trunc(Number(sequence)))}`;
    }
    const step = resolveItemCourse(item);
    return serviceStepLabels[step] || "";
  };

  return {
    resolveItemExplicitStep,
    resolveServiceStepRank,
    resolveItemStepRank,
    sortKitchenItemsByStep,
    getKitchenItems,
    getPendingKitchenItems,
    getKitchenItemsForServiceStep,
    getUpcomingKitchenItems,
    hasPendingKitchenItems,
    hasPreparingOrReadyKitchenItems,
    getServedOrReadyKitchenItems,
    resolveItemCourse,
    resolveOrderServiceStep,
    resolveOrderCurrentStep,
    resolveServiceStepFromCurrentStep,
    resolveNextServiceStep,
    resolveFormulaStepLabelForItem,
  };
};
