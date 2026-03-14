"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type DashboardOtpGateProps = {
  scope: "manager" | "super_admin";
};

export default function DashboardOtpGate({ scope }: DashboardOtpGateProps) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [initialOtpRequested, setInitialOtpRequested] = useState(false);

  const scopeLabel = scope === "super_admin" ? "Super Admin" : "Manager";

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
  };

  const sendOtp = async (isResend = false) => {
    setOtpError("");
    setOtpMessage("");
    setSendingOtp(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setSendingOtp(false);
      setOtpError("Session invalide.");
      return;
    }

    const response = await fetch("/api/auth/login-otp/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ scope }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSendingOtp(false);
    if (!response.ok) {
      setOtpError(payload.error || "Impossible d'envoyer le code OTP.");
      return;
    }

    setInitialOtpRequested(true);
    setOtpMessage(isResend ? "Un nouveau code a été envoyé par email." : "Un code à 6 chiffres a été envoyé par email.");
  };

  const checkOtpStatus = async () => {
    setCheckingStatus(true);
    setOtpError("");
    const { data } = await supabase.auth.getUser();
    setOtpEmail(String(data.user?.email || "").trim());

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCheckingStatus(false);
      setOtpRequired(true);
      setOtpError("Session invalide.");
      return;
    }

    const response = await fetch(`/api/auth/login-otp/status?scope=${encodeURIComponent(scope)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as { verified?: boolean; error?: string };
    if (!response.ok) {
      setCheckingStatus(false);
      setOtpRequired(true);
      setOtpError(payload.error || "Impossible de vérifier la sécurité OTP.");
      return;
    }

    const verified = Boolean(payload.verified);
    setOtpRequired(!verified);
    setCheckingStatus(false);
    if (!verified && !initialOtpRequested) {
      void sendOtp(false);
    }
  };

  useEffect(() => {
    void checkOtpStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setOtpError("");
    setOtpMessage("");
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setOtpError("Saisissez un code à 6 chiffres.");
      return;
    }

    setVerifyingOtp(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setVerifyingOtp(false);
      setOtpError("Session invalide.");
      return;
    }

    const response = await fetch("/api/auth/login-otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ scope, code }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setVerifyingOtp(false);
    if (!response.ok) {
      setOtpError(payload.error || "Code invalide ou expiré.");
      return;
    }

    setOtpCode("");
    setOtpRequired(false);
    setOtpMessage("");
  };

  if (!checkingStatus && !otpRequired) return null;

  return (
    <div className="fixed inset-0 z-[140] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black">Vérification OTP {scopeLabel}</h2>
        <p className="mt-2 text-sm text-gray-700">
          {checkingStatus
            ? "Vérification de sécurité en cours..."
            : `Saisissez le code envoyé à ${otpEmail || "votre adresse email"} avant d'accéder au tableau de bord.`}
        </p>
        {!checkingStatus ? (
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full rounded border border-gray-300 px-3 py-3 text-center text-2xl font-black tracking-[0.4em]"
            />
            {otpError ? <p className="text-sm font-bold text-red-600">{otpError}</p> : null}
            {otpMessage ? <p className="text-sm font-bold text-green-700">{otpMessage}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={verifyingOtp}
                className="px-4 py-2 rounded border-2 border-black bg-black text-white font-black disabled:opacity-60"
              >
                {verifyingOtp ? "Vérification..." : "Valider le code"}
              </button>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => void sendOtp(true)}
                className="px-4 py-2 rounded border-2 border-black bg-white font-black disabled:opacity-60"
              >
                {sendingOtp ? "Envoi..." : "Renvoyer le code"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
