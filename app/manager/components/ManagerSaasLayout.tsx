// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Archive,
  BarChart3,
  Brush,
  LogOut,
  Moon,
  Settings2,
  Shield,
  Sparkles,
  Store,
  Sun,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import styles from "./ManagerSaasLayout.module.css";

type ManagerTabKey = "menu" | "stats" | "staff" | "appearance" | "configuration" | "card_designer" | "security";

type ManagerSaasLayoutProps = {
  activeTab: ManagerTabKey;
  restaurantName: string;
  profileName: string;
  sectionTitle: string;
  onTabChange: (tab: ManagerTabKey) => void;
  onOpenArchives: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
};

const TABS: Array<{ id: ManagerTabKey; label: string; icon: React.ComponentType<any> }> = [
  { id: "menu", label: "Ma Carte", icon: UtensilsCrossed },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "staff", label: "Staff & Salles", icon: Users },
  { id: "appearance", label: "Apparence & Style", icon: Brush },
  { id: "configuration", label: "Configuration", icon: Settings2 },
  { id: "card_designer", label: "Design des Cartes", icon: Sparkles },
  { id: "security", label: "Sécurité", icon: Shield },
];

export default function ManagerSaasLayout(props: ManagerSaasLayoutProps) {
  const { activeTab, restaurantName, profileName, sectionTitle, onTabChange, onOpenArchives, onSignOut, children } = props;
  const [isDark, setIsDark] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const trimmedRestaurantName = String(restaurantName || "").trim() || "Restaurant";
  const trimmedProfileName = String(profileName || "").trim() || "Manager";
  const avatarText = trimmedProfileName.charAt(0).toUpperCase() || "M";
  const isDesignerTab = activeTab === "card_designer";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("elemdho-manager-theme");
    const nextIsDark = savedTheme ? savedTheme === "dark" : false;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle("dark", nextIsDark);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("elemdho-manager-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className={`${styles.root} ${isDark ? styles.rootDark : ""} manager-layout-v2`}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandRow}>
            <span className={styles.logoWrap} aria-hidden="true">
              <img src="/logo-elemdho.png.webp" alt="Logo Elemdho" className={styles.logoMark} />
            </span>
            <div className={styles.brandTextWrap}>
              <div className={styles.brandWord}>Elemdho</div>
            </div>
          </div>
          <div className={styles.brandName}>{trimmedRestaurantName}</div>
        </div>

        <nav className={styles.nav} aria-label="Navigation manager">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`${styles.navBtn} ${isActive ? styles.navBtnActive : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={16} />
                <span className={styles.navLabel}>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sideActions}>
          <button type="button" className={styles.sideActionBtn} onClick={onOpenArchives}>
            <Archive size={14} />
            Archives & Rapports
          </button>
          <button type="button" className={styles.sideActionBtn} onClick={onSignOut}>
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div className={styles.titleWrap}>
              {sectionTitle ? <h1 className={styles.title}>{sectionTitle}</h1> : null}
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.themeToggle}
                onClick={() => setIsDark((prev) => !prev)}
                aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
                title={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button
                type="button"
                className={styles.profile}
                onClick={() => onTabChange("security")}
                title="Accéder à la sécurité"
              >
                <span className={styles.avatar}>{avatarText}</span>
                <div className={styles.profileText}>
                  <div className={styles.profileName}>{trimmedProfileName}</div>
                  <div className={styles.profileRole}>Manager</div>
                </div>
                <Store size={14} color={isDark ? "#cbd5e1" : "#475569"} />
              </button>
            </div>
          </div>
        </header>

        <main className={`${styles.content} ${isDesignerTab ? styles.contentDesigner : ""}`}>
          <div className={`${styles.contentInner} ${isDesignerTab ? styles.contentInnerDesigner : ""}`}>{children}</div>
        </main>

        {!isDesignerTab ? (
          <footer className={styles.legalFooter}>
            <button type="button" className={styles.legalLink} onClick={() => setIsLegalModalOpen(true)}>
              Mentions Légales
            </button>
            <button type="button" className={styles.legalLink} onClick={() => setIsPrivacyModalOpen(true)}>
              Confidentialité
            </button>
          </footer>
        ) : null}

        {(isLegalModalOpen || isPrivacyModalOpen) && (
          <div className={styles.legalModalBackdrop} role="dialog" aria-modal="true">
            <div className={styles.legalModal}>
              <div className={styles.legalModalHeader}>
                <h3 className={styles.legalModalTitle}>
                  {isLegalModalOpen ? "Mentions Légales" : "Politique de Confidentialité"}
                </h3>
                <button
                  type="button"
                  className={styles.legalModalClose}
                  onClick={() => {
                    setIsLegalModalOpen(false);
                    setIsPrivacyModalOpen(false);
                  }}
                  aria-label="Fermer"
                  title="Fermer"
                >
                  X
                </button>
              </div>
              {isLegalModalOpen ? (
                <p className={styles.legalModalText}>
                  L'application Elemdho est éditée par Jules Delhomme, domicilié au 18 rue des primevères, 67600 Muttersholtz.
                  Contact : support@elemdho.fr.
                  <br />
                  Hébergement : La partie interface est hébergée par Vercel Inc. (San Francisco, USA) et la base de données
                  par Supabase Inc. (San Francisco, USA).
                  <br />
                  Cette application est un outil de facilitation de commande pour les restaurants.
                </p>
              ) : (
                <p className={styles.legalModalText}>
                  Elemdho collecte uniquement les données nécessaires au bon traitement de votre commande (numéro de table,
                  contenu de la commande). Ces données sont destinées exclusivement au personnel du restaurant pour la
                  réalisation du service. Aucune donnée n'est revendue à des tiers. Conformément au RGPD, vous disposez
                  d'un droit d'accès et de suppression de vos données en contactant l'éditeur.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
