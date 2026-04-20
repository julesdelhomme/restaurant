import { useMemo } from "react";

import type { CategoryItem, DishItem, FormulaSelection, Order } from "../types";
import type { Item } from "../utils/order-items";
import { normalizeLookupText, parsePriceNumber, readBooleanFlag } from "../utils/page-helpers";
import {
  isDirectFormulaSequence,
  mapSequenceToOrderStep,
  normalizeFormulaStepValue,
  normalizeServiceStep,
  parseFormulaEntryList,
  resolveCourseFromCategoryLabel,
  resolveCourseFromSequence,
  resolveInitialFormulaItemStatus,
  SERVICE_STEP_SEQUENCE,
} from "../utils/formula-workflow-helpers";
import { normalizeOrderStatus, normalizeWorkflowItemStatus } from "../utils/order-status-workflow";

type Args = {
  formulaDirectSendSequence: number;
  categoryById: Map<string, CategoryItem>;
  getCategoryLabel: (category: CategoryItem) => string;
  resolveDishDestination: (dish: DishItem | null | undefined) => "cuisine" | "bar";
  resolveDestinationForCategory: (categoryId: unknown, fallbackCategoryLabel?: string) => "cuisine" | "bar";
  parseItems: (items: unknown) => Item[];
  isDrink: (item: Item) => boolean;
  isItemServed: (item: Item) => boolean;
  getItemPrepStatus: (item: Item) => "pending" | "preparing" | "ready";
};

export function useAdminFormulaWorkflow(args: Args) {
  const {
    formulaDirectSendSequence,
    categoryById,
    getCategoryLabel,
    resolveDishDestination,
    resolveDestinationForCategory,
    parseItems,
    isDrink,
    isItemServed,
    getItemPrepStatus,
  } = args;

  return useMemo(() => {
    function resolveOrderStepForPayloadItem(item: Record<string, unknown>) {
      const explicit = mapSequenceToOrderStep(
        item.step ?? item.sequence ?? item.formula_current_sequence ?? item.formulaCurrentSequence,
        formulaDirectSendSequence
      );
      if (explicit != null) return explicit;
      const destination = String(item.destination || "").trim().toLowerCase();
      if (destination === "bar") return 0;
      const categoryId = item.category_id ?? item.categoryId ?? null;
      if (item.is_drink === true || isDrink(item as unknown as Item)) return 0;
      const resolvedDestination = resolveDestinationForCategory(categoryId, String(item.category || item.categorie || ""));
      if (resolvedDestination === "bar") return 0;
      const categoryLabel = normalizeLookupText(String(item.category || item.categorie || ""));
      if (/(entree|starter|appetizer)/.test(categoryLabel)) return 1;
      if (/(dessert|sweet|sucre|postre)/.test(categoryLabel)) return 3;
      return 2;
    }

    function resolveInitialCurrentStepFromItems(items: Array<Record<string, unknown>>) {
      const values = items
        .map((item) => Number(item.step))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.trunc(value));
      const positive = values.filter((value) => value > 0);
      if (positive.length > 0) return Math.min(...positive);
      return 0;
    }

    function resolveLegacyServiceStepFromCurrentStep(currentStep: number) {
      if (currentStep >= 3) return "dessert";
      if (currentStep <= 1) return "entree";
      return "plat";
    }

    function normalizeFormulaItemsForOrderPayload<T extends Record<string, unknown>>(items: T[]) {
      const normalized = items.map((entry) => {
        const current = { ...entry } as T;
        const step = resolveOrderStepForPayloadItem(current as Record<string, unknown>);
        const currentRecord = current as Record<string, unknown>;
        currentRecord.step = step;
        currentRecord.sequence = step;
        const formulaDishId = String(
          currentRecord.formula_dish_id ?? currentRecord.formulaDishId ?? currentRecord.formula_id ?? currentRecord.formulaId ?? ""
        ).trim();
        const isFormulaItem = readBooleanFlag(currentRecord.is_formula, false) || Boolean(formulaDishId);
        if (isFormulaItem) {
          const existingStatus = String(currentRecord.status || "").trim().toLowerCase();
          if (!existingStatus || existingStatus === "pending" || existingStatus === "waiting") {
            const sequence = normalizeFormulaStepValue(
              currentRecord.step ?? currentRecord.sequence ?? currentRecord.formula_current_sequence ?? currentRecord.formulaCurrentSequence,
              true
            );
            const sortOrder = currentRecord.sort_order ?? currentRecord.step_number ?? currentRecord.sortOrder;
            currentRecord.status = resolveInitialFormulaItemStatus(sequence, formulaDirectSendSequence, sortOrder);
          }
        }
        return current;
      });

      const byFormulaInstance = new Map<string, number[]>();
      normalized.forEach((entry, index) => {
        const record = entry as Record<string, unknown>;
        const formulaDishId = String(
          record.formula_dish_id ?? record.formulaDishId ?? record.formula_id ?? record.formulaId ?? ""
        ).trim();
        const isFormulaItem = readBooleanFlag(record.is_formula, false) || Boolean(formulaDishId);
        if (!isFormulaItem || !formulaDishId) return;
        const explicitInstance = String(record.formula_instance_id ?? record.formulaInstanceId ?? "").trim();
        const key = explicitInstance || formulaDishId;
        const list = byFormulaInstance.get(key) || [];
        list.push(index);
        byFormulaInstance.set(key, list);
      });

      byFormulaInstance.forEach((indexes) => {
        if (indexes.length === 0) return;
        const pickParentIndex = () => {
          for (const index of indexes) {
            const rec = normalized[index] as Record<string, unknown>;
            if (readBooleanFlag(rec.is_formula_parent ?? rec.isFormulaParent, false)) return index;
          }
          for (const index of indexes) {
            const rec = normalized[index] as Record<string, unknown>;
            if (readBooleanFlag(rec.is_main ?? rec.isMain, false)) return index;
          }
          for (const index of indexes) {
            const rec = normalized[index] as Record<string, unknown>;
            if (parsePriceNumber(rec.price) > 0 || parsePriceNumber(rec.formula_unit_price) > 0) return index;
          }
          return indexes[0];
        };
        const parentIndex = pickParentIndex();
        const parent = normalized[parentIndex] as Record<string, unknown>;
        const parentUnitPrice =
          parsePriceNumber(parent.price) > 0 ? parsePriceNumber(parent.price) : parsePriceNumber(parent.formula_unit_price);
        parent.is_formula = true;
        parent.is_formula_parent = true;
        parent.price = parentUnitPrice;
        parent.base_price = parentUnitPrice;
        parent.unit_total_price = parentUnitPrice;
        parent.formula_unit_price = parentUnitPrice;

        indexes.forEach((index) => {
          if (index === parentIndex) return;
          const child = normalized[index] as Record<string, unknown>;
          child.is_formula = true;
          child.is_formula_parent = false;
          child.price = 0;
          child.base_price = 0;
          child.unit_total_price = 0;
          child.formula_unit_price = 0;
        });
      });

      const normalizeItemStatus = (value: unknown) =>
        String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();

      const initialCurrentStep = resolveInitialCurrentStepFromItems(normalized as Array<Record<string, unknown>>);
      normalized.forEach((entry) => {
        const record = entry as Record<string, unknown>;
        const status = normalizeItemStatus(record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state);
        if (
          [
            "served",
            "servi",
            "servie",
            "ready",
            "ready_bar",
            "pret",
            "prete",
            "ready_to_serve",
            "preparing",
            "in_progress",
            "in progress",
            "to_prepare",
            "to_prepare_kitchen",
            "to_prepare_bar",
            "en_preparation",
            "en preparation",
          ].includes(status)
        ) {
          return;
        }
        const step = normalizeFormulaStepValue(record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence, true);
        if (step != null && initialCurrentStep > 0) {
          if (step === initialCurrentStep) {
            record.status = "preparing";
            return;
          }
          if (step > initialCurrentStep) {
            record.status = "waiting";
            return;
          }
        }
        if (!status) record.status = "pending";
      });

      return normalized;
    }

    function resolveFormulaSelectionDestination(
      selection: Pick<FormulaSelection, "sequence" | "destination" | "categoryId" | "categoryLabel">,
      dish: DishItem | null | undefined
    ): "cuisine" | "bar" {
      if (isDirectFormulaSequence(selection.sequence, formulaDirectSendSequence)) return "bar";
      const explicit = String(selection.destination || "").trim().toLowerCase();
      if (explicit === "bar") return "bar";
      if (explicit === "cuisine" || explicit === "kitchen") return "cuisine";
      if (dish) return resolveDishDestination(dish);
      return resolveDestinationForCategory(selection.categoryId, selection.categoryLabel || "");
    }

    function isFormulaOrderItem(item: Item) {
      const record = item as unknown as Record<string, unknown>;
      const isFormulaFlag = readBooleanFlag(record.is_formula, false);
      const formulaId = String(record.formula_id ?? record.formulaId ?? record.formula_dish_id ?? record.formulaDishId ?? "").trim();
      return isFormulaFlag || Boolean(formulaId);
    }

    function resolveFormulaSequenceListForItem(item: Item) {
      const record = item as unknown as Record<string, unknown>;
      const values: number[] = [];
      const pushSequence = (value: unknown) => {
        const normalized = normalizeFormulaStepValue(value, true);
        if (normalized == null || normalized <= 0) return;
        values.push(normalized);
      };
      pushSequence(record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence);
      const sources = [record.formula_items, record.formulaItems, record.selected_options, record.selectedOptions, record.options];
      sources.forEach((source) => {
        parseFormulaEntryList(source).forEach((entry) => {
          const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
          const isFormulaEntry = kind === "formula" || kind.includes("formula") || entry.formula_dish_id != null || entry.sequence != null;
          if (!isFormulaEntry) return;
          pushSequence(entry.step ?? entry.sequence ?? entry.service_step_sequence);
        });
      });
      return Array.from(new Set(values)).sort((a, b) => a - b);
    }

    function resolveCurrentFormulaSequenceForItem(item: Item) {
      const record = item as unknown as Record<string, unknown>;
      const directCurrent = normalizeFormulaStepValue(
        record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence,
        true
      );
      if (directCurrent != null && directCurrent > 0) return directCurrent;
      const sequences = resolveFormulaSequenceListForItem(item);
      if (sequences.length === 0) return null;
      return sequences[0];
    }

    function resolveNextFormulaSequenceForItem(item: Item) {
      const currentSequence = resolveCurrentFormulaSequenceForItem(item);
      if (!Number.isFinite(currentSequence)) return null;
      const sequences = resolveFormulaSequenceListForItem(item);
      return sequences.find((sequence) => sequence > Number(currentSequence)) || null;
    }

    function resolveFormulaEntryForSequence(item: Item, sequence: number) {
      const record = item as unknown as Record<string, unknown>;
      const sources = [record.formula_items, record.formulaItems, record.selected_options, record.selectedOptions, record.options];
      for (const source of sources) {
        const entries = parseFormulaEntryList(source);
        for (const entry of entries) {
          const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
          const isFormulaEntry = kind === "formula" || kind.includes("formula") || entry.formula_dish_id != null || entry.sequence != null;
          if (!isFormulaEntry) continue;
          const rawSequence = Number(entry.step ?? entry.sequence ?? entry.service_step_sequence);
          if (!Number.isFinite(rawSequence) || rawSequence <= 0) continue;
          const normalizedSequence = Math.max(1, Math.trunc(rawSequence));
          if (normalizedSequence === sequence) return entry;
        }
      }
      return null;
    }

    function resolveItemCourse(item: Item) {
      const currentFormulaSequence = resolveCurrentFormulaSequenceForItem(item);
      if (Number.isFinite(currentFormulaSequence) && Number(currentFormulaSequence) > 0) {
        const fromSequence = resolveCourseFromSequence(currentFormulaSequence);
        if (fromSequence) return fromSequence;
      }
      const record = item as unknown as Record<string, unknown>;
      const dishData = (record.dish ?? null) as Record<string, unknown> | null;
      const itemCategoryId = String(record.category_id ?? record.categoryId ?? "").trim();
      const dishCategoryId =
        itemCategoryId || String(dishData?.category_id ?? dishData?.categoryId ?? record.dish_id ?? record.id ?? "").trim();
      const categoryRow = dishCategoryId ? categoryById.get(String(dishCategoryId || "").trim()) : undefined;
      const categoryLabel = categoryRow ? getCategoryLabel(categoryRow) : String(record.categorie || record.category || "").trim();
      return resolveCourseFromCategoryLabel(categoryLabel);
    }

    function resolveItemCourses(item: Item) {
      const sequenceCourses = resolveFormulaSequenceListForItem(item).map((sequence) => resolveCourseFromSequence(sequence)).filter(Boolean);
      if (sequenceCourses.length > 0) return Array.from(new Set(sequenceCourses));
      return [resolveItemCourse(item)];
    }

    function resolveOrderServiceStep(order: Order, items: Item[]) {
      const foodItems = items.filter((item) => !isDrink(item));
      if (foodItems.length === 0) return "";
      const availableSteps = new Set(foodItems.flatMap((item) => resolveItemCourses(item)));
      const normalized = normalizeServiceStep(order.service_step);
      if (normalized && availableSteps.has(normalized)) return normalized;
      const fallback = SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step));
      return fallback || normalized || "";
    }

    function resolveNextServiceStep(order: Order, items: Item[]) {
      const foodItems = items.filter((item) => !isDrink(item));
      if (foodItems.length === 0) return "";
      const availableSteps = new Set(foodItems.flatMap((item) => resolveItemCourses(item)));
      const current = resolveOrderServiceStep(order, items);
      const startIndex = current ? SERVICE_STEP_SEQUENCE.indexOf(current as (typeof SERVICE_STEP_SEQUENCE)[number]) : -1;
      const firstAvailable = SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step)) || "";
      if (startIndex < 0) return firstAvailable;
      for (let index = startIndex + 1; index < SERVICE_STEP_SEQUENCE.length; index += 1) {
        const step = SERVICE_STEP_SEQUENCE[index];
        if (availableSteps.has(step)) return step;
      }
      return "";
    }

    function isItemWaitingOrPending(item: Item) {
      const normalized = normalizeWorkflowItemStatus(item);
      if (!normalized) return true;
      if (["waiting", "en_attente", "attente", "queued", "queue", "pending"].includes(normalized)) return true;
      return getItemPrepStatus(item) === "pending";
    }

    function resolveWorkflowStepForItem(item: Item) {
      const record = item as unknown as Record<string, unknown>;
      const directStep = normalizeFormulaStepValue(
        record.step ??
          record.sequence ??
          record.step_number ??
          record.sort_order ??
          record.sortOrder ??
          record.service_step_sequence ??
          record.formula_current_sequence ??
          record.formulaCurrentSequence,
        true
      );
      if (directStep != null && directStep > 0) return directStep;
      const fallback = resolveCurrentFormulaSequenceForItem(item);
      if (Number.isFinite(fallback) && Number(fallback) > 0) {
        const fallbackStep = Math.max(1, Math.trunc(Number(fallback)));
        if (Number.isFinite(fallbackStep) && fallbackStep > 0) return fallbackStep;
      }
      const course = resolveItemCourse(item);
      if (course === "entree") return 1;
      if (course === "dessert") return 3;
      if (course === "plat") return 2;
      return null;
    }

    function resolveOrderCurrentStep(order: Order) {
      const direct = normalizeFormulaStepValue(
        (order as unknown as Record<string, unknown>).current_step ?? (order as unknown as Record<string, unknown>).currentStep,
        true
      );
      if (direct != null) return direct;
      const fromService = normalizeServiceStep(order.service_step);
      if (fromService === "entree") return 1;
      if (fromService === "plat") return 2;
      if (fromService === "dessert") return 3;
      const steps = parseItems(order.items)
        .map((item) => resolveWorkflowStepForItem(item))
        .filter((value): value is number => Number.isFinite(value));
      const positive = steps.filter((value) => value > 0);
      if (positive.length > 0) return Math.min(...positive);
      return 0;
    }

    function resolveNextFormulaStep(order: Order) {
      const formulaItems = parseItems(order.items).filter((item) => isFormulaOrderItem(item) && !isDrink(item));
      if (formulaItems.length === 0) return null;
      const currentStep = resolveOrderCurrentStep(order);
      if (!Number.isFinite(currentStep) || currentStep <= 0) return null;
      const currentStepItems = formulaItems.filter((item) => resolveWorkflowStepForItem(item) === currentStep);
      if (currentStepItems.length === 0) return null;
      const orderRecord = order as unknown as Record<string, unknown>;
      const rawStepStatus = orderRecord.step_status ?? orderRecord.current_step_status ?? orderRecord.stepStatus ?? orderRecord.currentStepStatus;
      const normalizedStepStatus = normalizeOrderStatus(rawStepStatus);
      const rawStepNumber = orderRecord.step_number ?? orderRecord.current_step ?? orderRecord.currentStep ?? orderRecord.service_step;
      const statusStepNumber = normalizeFormulaStepValue(rawStepNumber, true);
      const isCurrentStepMarkedServed =
        ["served", "servi", "servie"].includes(normalizedStepStatus) && (statusStepNumber == null || statusStepNumber === currentStep);
      if (!isCurrentStepMarkedServed && !currentStepItems.every((item) => isItemServed(item))) return null;

      const higherSteps = formulaItems
        .map((item) => resolveWorkflowStepForItem(item))
        .filter((value): value is number => value !== null && Number.isFinite(value) && value > currentStep);
      if (higherSteps.length === 0) return null;
      const nextStep = Math.min(...higherSteps);
      if (!Number.isFinite(nextStep)) return null;
      const nextStepItems = formulaItems.filter((item) => resolveWorkflowStepForItem(item) === nextStep);
      if (nextStepItems.length === 0) return null;
      if (!nextStepItems.every((item) => isItemWaitingOrPending(item))) return null;
      false && console.log("TRACE:", {
        context: "admin.resolveNextFormulaStep",
        orderId: order.id,
        currentStep,
        nextStep,
        formulaItems: formulaItems.map((item) => {
          const record = item as unknown as Record<string, unknown>;
          return {
            order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
            dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
            step: resolveWorkflowStepForItem(item),
            isDrink: isDrink(item),
            status: String(record.status ?? "").trim() || null,
          };
        }),
      });
      return nextStep;
    }

    function resolveImmediateNextFormulaStep(order: Order) {
      const formulaItems = parseItems(order.items).filter((item) => isFormulaOrderItem(item) && !isDrink(item));
      if (formulaItems.length === 0) return null;
      const currentStep = resolveOrderCurrentStep(order);
      if (!Number.isFinite(currentStep) || currentStep <= 0) return null;
      const higherSteps = formulaItems
        .map((item) => resolveWorkflowStepForItem(item))
        .filter((value): value is number => value !== null && Number.isFinite(value) && value > currentStep);
      if (higherSteps.length === 0) return null;
      return Math.min(...higherSteps);
    }

    function isOrderInProgressForNextStep(order: Order) {
      const status = normalizeOrderStatus(order.status);
      if (
        [
          "preparing",
          "en preparation",
          "en_preparation",
          "en cours",
          "en_cours",
          "in progress",
          "in_progress",
          "pending",
          "to_prepare",
          "to_prepare_kitchen",
          "to_prepare_bar",
        ].includes(status)
      ) {
        return true;
      }
      const activeItems = parseItems(order.items).filter((item) => !isItemServed(item as Item));
      return activeItems.some((item) => {
        const prepStatus = getItemPrepStatus(item as Item);
        return prepStatus === "pending" || prepStatus === "preparing";
      });
    }

    return {
      resolveOrderStepForPayloadItem,
      normalizeFormulaItemsForOrderPayload,
      resolveInitialCurrentStepFromItems,
      resolveLegacyServiceStepFromCurrentStep,
      resolveFormulaSelectionDestination,
      isFormulaOrderItem,
      resolveFormulaSequenceListForItem,
      resolveCurrentFormulaSequenceForItem,
      resolveNextFormulaSequenceForItem,
      resolveFormulaEntryForSequence,
      resolveItemCourse,
      resolveItemCourses,
      resolveOrderServiceStep,
      resolveNextServiceStep,
      resolveWorkflowStepForItem,
      resolveOrderCurrentStep,
      resolveNextFormulaStep,
      resolveImmediateNextFormulaStep,
      isOrderInProgressForNextStep,
    };
  }, [
    formulaDirectSendSequence,
    categoryById,
    getCategoryLabel,
    resolveDishDestination,
    resolveDestinationForCategory,
    parseItems,
    isDrink,
    isItemServed,
    getItemPrepStatus,
  ]);
}
