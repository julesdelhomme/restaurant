"use client";

import React, { useEffect, useMemo, useState } from "react";
import { legalTranslations } from "../constants/legalTranslations";

const LEGAL_ACCEPTED_KEY = "legal_accepted";
const LEGAL_ACCEPTED_LEGACY_KEY = "elemdho_legal_accepted";

type WelcomeI18nEntry = {
  title: string;
  body: string;
  accept: string;
  detailsLink: string;
  customNoticeTitle: string;
};

const WELCOME_I18N: Record<string, WelcomeI18nEntry> = {
  fr: {
    title: "Informations",
    body: "En continuant sur cette application, vous acceptez nos Mentions légales et vous vous engagez à régler le montant total de vos commandes à la caisse de l'établissement avant votre départ.",
    accept: "Accepter et continuer",
    detailsLink: "Voir les détails des mentions légales",
    customNoticeTitle: "Règlement de l'établissement :",
  },
  en: {
    title: "Information",
    body: "By continuing in this application, you accept our legal notice and commit to paying the full total of your orders at the restaurant checkout before leaving.",
    accept: "Accept and continue",
    detailsLink: "View legal details",
    customNoticeTitle: "Restaurant policy:",
  },
  pt: {
    title: "Informações",
    body: "Ao continuar nesta aplicacao, aceita os nossos termos legais e compromete-se a pagar o total dos seus pedidos na caixa do estabelecimento antes de sair.",
    accept: "Aceitar e continuar",
    detailsLink: "Ver detalhes legais",
    customNoticeTitle: "Regulamento do estabelecimento:",
  },
  es: {
    title: "Información",
    body: "Al continuar en esta aplicacion, usted acepta nuestros terminos legales y se compromete a pagar el total de sus pedidos en caja antes de salir del establecimiento.",
    accept: "Aceptar y continuar",
    detailsLink: "Ver detalles legales",
    customNoticeTitle: "Reglamento del establecimiento:",
  },
  de: {
    title: "Informationen",
    body: "Wenn Sie diese Anwendung weiter nutzen, akzeptieren Sie unsere rechtlichen Hinweise und verpflichten sich, den Gesamtbetrag Ihrer Bestellungen an der Kasse des Betriebs vor dem Verlassen zu bezahlen.",
    accept: "Akzeptieren und fortfahren",
    detailsLink: "Rechtliche Details anzeigen",
    customNoticeTitle: "Regeln des Betriebs:",
  },
  it: {
    title: "Informazioni",
    body: "Continuando su questa applicazione, accetta le nostre note legali e si impegna a pagare l'importo totale dei suoi ordini alla cassa del locale prima di andare via.",
    accept: "Accetta e continua",
    detailsLink: "Vedi i dettagli legali",
    customNoticeTitle: "Regolamento del locale:",
  },
  nl: {
    title: "Informatie",
    body: "Door verder te gaan in deze applicatie accepteert u onze juridische voorwaarden en verbindt u zich ertoe het volledige totaal van uw bestellingen aan de kassa van het etablissement te betalen voordat u vertrekt.",
    accept: "Accepteren en doorgaan",
    detailsLink: "Bekijk juridische details",
    customNoticeTitle: "Huisregels van het restaurant:",
  },
  pl: {
    title: "Informacje",
    body: "Kontynuujac korzystanie z tej aplikacji, akceptujesz nasze warunki prawne i zobowiazujesz sie oplacic pelna kwote zamowien w kasie lokalu przed wyjsciem.",
    accept: "Akceptuj i kontynuuj",
    detailsLink: "Zobacz szczegoly prawne",
    customNoticeTitle: "Regulamin lokalu:",
  },
  ro: {
    title: "Informatii",
    body: "Continuand in aceasta aplicatie, acceptati termenii nostri legali si va angajati sa achitati suma totala a comenzilor la casa localului inainte de plecare.",
    accept: "Accept si continua",
    detailsLink: "Vezi detalii legale",
    customNoticeTitle: "Regulamentul localului:",
  },
  el: {
    title: "Information",
    body: "Synehizontas se afti tin efarmogi, apodeheste tous nomikous orous kai desmeveste na exoflisete to synoliko poso ton paraggelion sas sto tameio tou katastimatos prin tin anahorisi sas.",
    accept: "Apodochi kai synecheia",
    detailsLink: "Deite nomikes leptomeries",
    customNoticeTitle: "Kanonismos katastimatos:",
  },
  ja: {
    title: "Information",
    body: "By continuing in this app, you accept our legal notice and commit to paying your order total at checkout before leaving.",
    accept: "Accept and continue",
    detailsLink: "View legal details",
    customNoticeTitle: "Restaurant policy:",
  },
  zh: {
    title: "Information",
    body: "By continuing in this app, you accept our legal notice and commit to paying your order total at checkout before leaving.",
    accept: "Accept and continue",
    detailsLink: "View legal details",
    customNoticeTitle: "Restaurant policy:",
  },
  ko: {
    title: "Information",
    body: "By continuing in this app, you accept our legal notice and commit to paying your order total at checkout before leaving.",
    accept: "Accept and continue",
    detailsLink: "View legal details",
    customNoticeTitle: "Restaurant policy:",
  },
  ru: {
    title: "Information",
    body: "Prodolzhaya polzovatsya etim prilozheniem, vy prinimaete nashi yuridicheskie usloviya i obyazuetes oplatit polnuyu summu vashih zakazov na kasse zavedenia pered uhodom.",
    accept: "Prinyat i prodolzhit",
    detailsLink: "Pokazat yuridicheskie detali",
    customNoticeTitle: "Pravila zavedeniya:",
  },
  ar: {
    title: "Information",
    body: "Bimutaabat istikhdam hatha altatbiq, antum tuwaafiqun ealaa albunood alqanuniya wataltazimun bidafie ijmali talabatikum eind sunduq almuasasati qabl almughadara.",
    accept: "Muwafaqa wa mutabaea",
    detailsLink: "Ard altfasil alqanuniya",
    customNoticeTitle: "Qawaeid almuassasa:",
  },
};

function normalizeLangKey(lang: string | null | undefined): string {
  const raw = String(lang || "").trim().toLowerCase();
  if (!raw) return "fr";
  const base = raw.split("-")[0];
  const aliases: Record<string, string> = {
    jp: "ja",
    cn: "zh",
    kr: "ko",
    gr: "el",
  };
  return aliases[base] || base;
}

type LegalWelcomeModalProps = {
  lang: string;
  restaurantName: string;
  customLegalNotice?: string;
  splashEnabled?: boolean;
  splashType?: string | null;
  splashText?: string | null;
  splashImageUrl?: string | null;
};

export default function LegalWelcomeModal({
  lang,
  restaurantName,
  customLegalNotice,
  splashEnabled = false,
  splashType = "text",
  splashText,
  splashImageUrl,
}: LegalWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const langKey = normalizeLangKey(lang);

  const copy = useMemo(() => {
    return WELCOME_I18N[langKey] || WELCOME_I18N.fr;
  }, [langKey]);

  const legalDetailsText = useMemo(() => {
    const entry = legalTranslations[langKey] || legalTranslations.fr;
    return entry?.legalText || legalTranslations.fr.legalText;
  }, [langKey]);

  useEffect(() => {
    try {
      const accepted = window.localStorage.getItem(LEGAL_ACCEPTED_KEY) || window.localStorage.getItem(LEGAL_ACCEPTED_LEGACY_KEY);
      setIsOpen(!accepted);
    } catch {
      setIsOpen(true);
    } finally {
      setIsReady(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(LEGAL_ACCEPTED_KEY, "1");
      window.localStorage.removeItem(LEGAL_ACCEPTED_LEGACY_KEY);
    } catch {
      // Keep flow functional even if storage is unavailable.
    }
    setIsOpen(false);
  };

  if (!isReady || !isOpen) return null;

  const safeCustomNotice = String(customLegalNotice || "").trim();
  const safeSplashText = String(splashText || "").trim();
  const safeSplashImage = String(splashImageUrl || "").trim();
  const normalizedSplashType = String(splashType || "text").trim().toLowerCase();
  const showSplash = splashEnabled && (Boolean(safeSplashText) || Boolean(safeSplashImage));

  return (
    <div className="fixed inset-0 z-[9000] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative z-[9001] w-full max-w-xl rounded-2xl border-4 border-black bg-white text-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-black">{copy.title}</h2>
        {showSplash ? (
          <div className="mt-3 rounded-lg border-2 border-black bg-[#fff9e7] p-3">
            {normalizedSplashType === "image" && safeSplashImage ? (
              <img src={safeSplashImage} alt={restaurantName || "Welcome"} className="w-full max-h-48 object-cover rounded-md border border-black/20" />
            ) : null}
            {safeSplashText ? <p className="mt-2 text-sm font-bold leading-relaxed whitespace-pre-wrap">{safeSplashText}</p> : null}
          </div>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed font-semibold">{copy.body}</p>
        {safeCustomNotice ? (
          <div className="mt-3 rounded-lg border-2 border-black/20 bg-gray-50 p-3">
            <div className="text-xs font-black uppercase tracking-wide">{copy.customNoticeTitle}</div>
            <p className="mt-1 text-xs leading-relaxed font-semibold whitespace-pre-wrap">{safeCustomNotice}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-4 text-xs underline font-bold"
        >
          {copy.detailsLink}
        </button>
        {showDetails ? (
          <div className="mt-3 rounded-lg border-2 border-black/20 bg-gray-50 p-3 text-xs leading-relaxed">
            {legalDetailsText}
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleAccept}
          className="mt-5 w-full rounded-xl border-4 border-black bg-black text-white py-3 text-sm font-black"
        >
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
