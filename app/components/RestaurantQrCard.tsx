"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { buildRestaurantPublicUrl, buildRestaurantVitrineUrl } from "@/lib/restaurant-url";

type RestaurantQrCardProps = {
  restaurantId: string;
  restaurantName?: string;
  logoUrl?: string;
  primaryColor?: string;
  size?: number;
  compact?: boolean;
  mode?: "menu" | "vitrine";
  title?: string;
};

function normalizeHexColor(raw: unknown, fallback: string) {
  const value = String(raw || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function RestaurantQrCard({
  restaurantId,
  restaurantName,
  logoUrl,
  primaryColor,
  size,
  compact = false,
  mode = "menu",
  title,
}: RestaurantQrCardProps) {
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const exportWrapperRef = useRef<HTMLDivElement | null>(null);
  const safeRestaurantId = String(restaurantId || "").trim();
  const safeRestaurantName = String(restaurantName || safeRestaurantId || "restaurant").trim();
  const safeLogoUrl = String(logoUrl || "").trim();
  const [loadedLogoUrl, setLoadedLogoUrl] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const LOGO_RATIO = 0.24;
  const EXPORT_SIZE = 1024;
  const qrSize = Number.isFinite(Number(size)) && Number(size) > 0 ? Number(size) : compact ? 120 : 220;
  const qrColor = normalizeHexColor(primaryColor, "#111111");
  const menuUrl = useMemo(() => {
    if (mode === "vitrine") return buildRestaurantVitrineUrl(safeRestaurantId);
    return buildRestaurantPublicUrl(safeRestaurantId);
  }, [mode, safeRestaurantId]);
  const cardTitle = title || (mode === "vitrine" ? "QR Code Vitrine" : "Mon QR Code");

  useEffect(() => {
    if (!safeLogoUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) {
        setLoadedLogoUrl(safeLogoUrl);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setFailedLogoUrl(safeLogoUrl);
      }
    };
    img.src = safeLogoUrl;
    return () => {
      cancelled = true;
    };
  }, [safeLogoUrl]);
  const isLogoReady = Boolean(safeLogoUrl) && loadedLogoUrl === safeLogoUrl;
  const isLogoError = Boolean(safeLogoUrl) && failedLogoUrl === safeLogoUrl;
  const isLogoLoading = Boolean(safeLogoUrl) && !isLogoReady && !isLogoError;

  const handleDownloadPng = () => {
    setDownloadError("");
    if (isLogoLoading) {
      setDownloadError("Le logo est en cours de chargement, reessayez dans un instant.");
      return;
    }

    const canvas = exportWrapperRef.current?.querySelector("canvas") || previewWrapperRef.current?.querySelector("canvas");
    if (!canvas) {
      setDownloadError("QR Code indisponible pour le moment.");
      return;
    }

    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      setDownloadError("Telechargement bloque: verifiez le CORS du logo.");
      return;
    }

    const link = document.createElement("a");
    const safeFileName = safeRestaurantName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    link.href = dataUrl;
    link.download = `qr-menu-${safeFileName || "restaurant"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={`rounded-xl border border-gray-300 bg-white p-3 ${compact ? "" : "shadow-sm"}`}>
      {!compact ? <h3 className="text-base font-black">{cardTitle}</h3> : null}
      <div className={`mt-2 flex ${compact ? "items-center gap-3" : "flex-col items-center gap-2"}`}>
        <div ref={previewWrapperRef} className="rounded-lg border border-gray-200 bg-white p-2">
          <QRCodeCanvas
            value={menuUrl}
            size={qrSize}
            bgColor="#FFFFFF"
            fgColor={qrColor}
            includeMargin
            level="H"
            style={{ imageRendering: "pixelated" }}
            imageSettings={
              safeLogoUrl
                ? {
                    src: safeLogoUrl,
                    height: Math.round(qrSize * LOGO_RATIO),
                    width: Math.round(qrSize * LOGO_RATIO),
                    excavate: true,
                    crossOrigin: "anonymous",
                  }
                : undefined
            }
          />
        </div>
        <div className={`${compact ? "flex-1" : "w-full"} text-xs text-gray-600`}>
          <p className="break-all">{menuUrl}</p>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isLogoLoading}
            className="mt-2 inline-flex px-3 py-1 border-2 border-black rounded font-black bg-black text-white disabled:opacity-60"
          >
            Telecharger le QR Code
          </button>
          {downloadError ? <p className="mt-1 text-xs font-bold text-red-700">{downloadError}</p> : null}
        </div>
      </div>
      <div ref={exportWrapperRef} className="sr-only" aria-hidden>
        <QRCodeCanvas
          value={menuUrl}
          size={EXPORT_SIZE}
          bgColor="#FFFFFF"
          fgColor={qrColor}
          includeMargin
          level="H"
          style={{ imageRendering: "pixelated" }}
          imageSettings={
            safeLogoUrl
              ? {
                  src: safeLogoUrl,
                  height: Math.round(EXPORT_SIZE * LOGO_RATIO),
                  width: Math.round(EXPORT_SIZE * LOGO_RATIO),
                  excavate: true,
                  crossOrigin: "anonymous",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
