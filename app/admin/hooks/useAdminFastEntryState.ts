import { useState } from "react";
import type { DishItem, ExtraChoice, FastOrderLine, ProductOptionChoice } from "../types";

export function useAdminFastEntryState() {
  const [fastCoversInput, setFastCoversInput] = useState("1");
  const [fastQtyByDish, setFastQtyByDish] = useState<Record<string, number>>({});
  const [baseLineComments, setBaseLineComments] = useState<Record<string, string>>({});
  const [fastOptionLines, setFastOptionLines] = useState<FastOrderLine[]>([]);
  const [fastLoading, setFastLoading] = useState(false);
  const [fastMessage, setFastMessage] = useState("");
  const [kitchenNoteOpen, setKitchenNoteOpen] = useState(false);
  const [kitchenNoteText, setKitchenNoteText] = useState("");
  const [kitchenNoteSending, setKitchenNoteSending] = useState(false);
  const [kitchenNoteFeedback, setKitchenNoteFeedback] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDish, setModalDish] = useState<DishItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalSideChoices, setModalSideChoices] = useState<string[]>([]);
  const [modalSelectedSides, setModalSelectedSides] = useState<string[]>([]);
  const [modalProductOptions, setModalProductOptions] = useState<ProductOptionChoice[]>([]);
  const [modalSelectedProductOptionId, setModalSelectedProductOptionId] = useState("");
  const [modalExtraChoices, setModalExtraChoices] = useState<ExtraChoice[]>([]);
  const [modalSelectedExtras, setModalSelectedExtras] = useState<ExtraChoice[]>([]);
  const [modalCooking, setModalCooking] = useState("");
  const [modalKitchenComment, setModalKitchenComment] = useState("");

  return {
    fastCoversInput,
    setFastCoversInput,
    fastQtyByDish,
    setFastQtyByDish,
    baseLineComments,
    setBaseLineComments,
    fastOptionLines,
    setFastOptionLines,
    fastLoading,
    setFastLoading,
    fastMessage,
    setFastMessage,
    kitchenNoteOpen,
    setKitchenNoteOpen,
    kitchenNoteText,
    setKitchenNoteText,
    kitchenNoteSending,
    setKitchenNoteSending,
    kitchenNoteFeedback,
    setKitchenNoteFeedback,
    modalOpen,
    setModalOpen,
    modalDish,
    setModalDish,
    modalQty,
    setModalQty,
    modalSideChoices,
    setModalSideChoices,
    modalSelectedSides,
    setModalSelectedSides,
    modalProductOptions,
    setModalProductOptions,
    modalSelectedProductOptionId,
    setModalSelectedProductOptionId,
    modalExtraChoices,
    setModalExtraChoices,
    modalSelectedExtras,
    setModalSelectedExtras,
    modalCooking,
    setModalCooking,
    modalKitchenComment,
    setModalKitchenComment,
  };
}
