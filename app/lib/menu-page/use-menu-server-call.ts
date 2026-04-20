"use client";

import { useEffect } from "react";
import { LAST_SERVER_CALL_STORAGE_KEY, SERVER_CALL_THROTTLE_MS, type SmartCallOptionKey } from "./static";

type UseMenuServerCallArgs = {
  tt: (key: any) => string;
  tableNumber: string;
  orderValidationCodeInput: string;
  tablePinCodesByNumber: Record<string, string>;
  normalizeTableNumberKey: (value: unknown) => string;
  normalizePinValue: (value: unknown) => string;
  serverCallSecondsLeft: number;
  serverCallCooldownUntil: number;
  setServerCallCooldownUntil: (value: number) => void;
  setServerCallSecondsLeft: (value: number) => void;
  setServerCallMsg: (value: string) => void;
  serverCallThrottleLabel: string;
  isVitrineMode: boolean;
  setIsSendingCall: (value: boolean) => void;
  smartCallUi: { options: Record<string, string> };
  normalizedLang: string;
  SMART_CALL_UI: Record<string, { options: Record<string, string> }>;
  restaurant: { id?: string | number | null } | null;
  SETTINGS_ROW_ID: string;
  supabase: any;
  toLoggableSupabaseError: (error: unknown) => unknown;
  setShowCallModal: (value: boolean) => void;
  triggerHaptic: (pattern: number | number[]) => void;
};

export function useMenuServerCall({
  tt,
  tableNumber,
  orderValidationCodeInput,
  tablePinCodesByNumber,
  normalizeTableNumberKey,
  normalizePinValue,
  serverCallSecondsLeft,
  serverCallCooldownUntil,
  setServerCallCooldownUntil,
  setServerCallSecondsLeft,
  setServerCallMsg,
  serverCallThrottleLabel,
  isVitrineMode,
  setIsSendingCall,
  smartCallUi,
  normalizedLang,
  SMART_CALL_UI,
  restaurant,
  SETTINGS_ROW_ID,
  supabase,
  toLoggableSupabaseError,
  setShowCallModal,
  triggerHaptic,
}: UseMenuServerCallArgs) {
  const tableValidationPromptMessage = tt("validation_code_prompt");
  const normalizedTableKey = normalizeTableNumberKey(tableNumber);
  const tablePinCode = normalizedTableKey ? tablePinCodesByNumber[normalizedTableKey] : "";
  const expectedValidationCode = normalizePinValue(tablePinCode);
  const typedValidationCode = normalizePinValue(orderValidationCodeInput || "");
  const isServerCallThrottled = serverCallSecondsLeft > 0;
  const isValidationCodeValid =
    typedValidationCode.length > 0 && expectedValidationCode.length > 0 && typedValidationCode === expectedValidationCode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedAt = Number(window.localStorage.getItem(LAST_SERVER_CALL_STORAGE_KEY) || "0");
      const nextCooldownUntil = Number.isFinite(storedAt) && storedAt > 0 ? storedAt + SERVER_CALL_THROTTLE_MS : 0;
      if (!nextCooldownUntil || nextCooldownUntil <= Date.now()) {
        window.localStorage.removeItem(LAST_SERVER_CALL_STORAGE_KEY);
        setServerCallCooldownUntil(0);
        setServerCallSecondsLeft(0);
        return;
      }
      setServerCallCooldownUntil(nextCooldownUntil);
    } catch {
      setServerCallCooldownUntil(0);
      setServerCallSecondsLeft(0);
    }
  }, [setServerCallCooldownUntil, setServerCallSecondsLeft]);

  const startServerCallCooldown = () => {
    const lastCallAt = Date.now();
    const nextCooldownUntil = lastCallAt + SERVER_CALL_THROTTLE_MS;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_SERVER_CALL_STORAGE_KEY, String(lastCallAt));
      } catch {
        // Ignore storage failures: the action itself must still work.
      }
    }
    setServerCallCooldownUntil(nextCooldownUntil);
    setServerCallSecondsLeft(Math.ceil(SERVER_CALL_THROTTLE_MS / 1000));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!serverCallCooldownUntil) {
      setServerCallSecondsLeft(0);
      return;
    }
    const syncCountdown = () => {
      const remainingMs = serverCallCooldownUntil - Date.now();
      if (remainingMs <= 0) {
        try {
          window.localStorage.removeItem(LAST_SERVER_CALL_STORAGE_KEY);
        } catch {
          // localStorage unavailable: keep UI functional without persistence.
        }
        setServerCallCooldownUntil(0);
        setServerCallSecondsLeft(0);
        return;
      }
      setServerCallSecondsLeft(Math.ceil(remainingMs / 1000));
    };
    syncCountdown();
    const intervalId = window.setInterval(syncCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [serverCallCooldownUntil, setServerCallCooldownUntil, setServerCallSecondsLeft]);

  const handleSubmitSmartCall = async (callType: SmartCallOptionKey) => {
    setServerCallMsg("");
    if (isVitrineMode) {
      setServerCallMsg("Mode vitrine : appel serveur indisponible.");
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!tableNumber) {
      setServerCallMsg(tt("table_required"));
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!typedValidationCode) {
      setServerCallMsg(tableValidationPromptMessage);
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!isValidationCodeValid) {
      setServerCallMsg(tt("validation_code_invalid"));
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (isServerCallThrottled) {
      setServerCallMsg(serverCallThrottleLabel);
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    try {
      setIsSendingCall(true);
      const tableNum = Number(String(tableNumber || "").trim());
      if (!Number.isFinite(tableNum) || tableNum <= 0) {
        setServerCallMsg(tt("table_invalid"));
        setTimeout(() => setServerCallMsg(""), 2000);
        return;
      }
      const tableNumText = String(tableNum);
      const localizedMessage = smartCallUi.options[callType] || smartCallUi.options.help_question;
      const frenchMessage = (
        SMART_CALL_UI.fr?.options?.[callType] ||
        SMART_CALL_UI.fr?.options?.help_question ||
        localizedMessage
      ).trim();
      const payloadBase = {
        status: "pending",
        created_at: new Date(),
        type: "appel",
        message: frenchMessage,
        restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
      };

      const notificationPayloads = [
        {
          type: "CLIENT",
          status: "pending",
          message: frenchMessage,
          title: "Client request",
          table_number: tableNumText,
          table_id: tableNum,
          restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
          payload: {
            request_key: callType,
            request_type: callType,
            request_label_fr: frenchMessage,
            request_label_client: localizedMessage,
            client_lang: normalizedLang,
            source: "client_menu",
          },
          created_at: new Date().toISOString(),
        },
        {
          type: "CLIENT",
          status: "pending",
          message: frenchMessage,
          table_number: tableNumText,
          restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
          created_at: new Date().toISOString(),
        },
      ];
      let notificationSaved = false;
      let notificationError: unknown = null;
      for (const payload of notificationPayloads) {
        const notifTry = await supabase.from("notifications").insert([payload as never]);
        if (!notifTry.error) {
          notificationSaved = true;
          break;
        }
        notificationError = notifTry.error;
      }

      let callSaved = false;
      let callError: unknown = null;
      const firstTry = await supabase.from("calls").insert([{ ...payloadBase, table_number: tableNumText, table_id: tableNum }]);

      if (!firstTry.error) {
        callSaved = true;
      } else {
        const secondTry = await supabase.from("calls").insert([{ ...payloadBase, table_number: tableNumText }]);
        if (!secondTry.error) {
          callSaved = true;
        } else {
          const thirdTry = await supabase.from("calls").insert([{ ...payloadBase, table_id: tableNum }]);
          if (!thirdTry.error) {
            callSaved = true;
          } else {
            callError = thirdTry.error;
          }
        }
      }

      if (!notificationSaved) {
        console.warn("Server call notification insert failed:", toLoggableSupabaseError(notificationError));
      }
      if (!callSaved) {
        console.warn("Server call legacy calls insert failed:", toLoggableSupabaseError(callError || notificationError));
      }
      if (!notificationSaved && !callSaved) {
        throw callError || notificationError || new Error("Server call insert failed");
      }

      setShowCallModal(false);
      startServerCallCooldown();
      triggerHaptic([10, 50, 10]);
    } catch (error) {
      console.error("handleSubmitSmartCall failed:", toLoggableSupabaseError(error));
      setServerCallMsg("Impossible d'appeler le serveur pour le moment.");
      setTimeout(() => setServerCallMsg(""), 2500);
    } finally {
      setIsSendingCall(false);
    }
  };

  return {
    tableValidationPromptMessage,
    typedValidationCode,
    isValidationCodeValid,
    isServerCallThrottled,
    handleSubmitSmartCall,
  };
}
