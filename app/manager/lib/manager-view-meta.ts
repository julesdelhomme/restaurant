export function getManagerSectionTitle(activeManagerTab: string) {
  return activeManagerTab === "menu"
    ? "Restaurant menu"
    : activeManagerTab === "stats"
      ? "Statistiques"
      : activeManagerTab === "staff"
        ? "Staff & Salles"
        : activeManagerTab === "appearance"
          ? "Apparence & style"
          : activeManagerTab === "configuration"
            ? "Configuration"
            : activeManagerTab === "card_designer"
              ? "Design des cartes"
              : "Sécurité";
}

export function getManagerIdentity(params: {
  managerUserEmail: string;
  restaurantFormName: string;
  restaurantName?: string | null;
}) {
  const managerProfileName = String(
    params.managerUserEmail || params.restaurantFormName || params.restaurantName || "Manager"
  ).trim();
  const managerRestaurantName = String(params.restaurantFormName || params.restaurantName || "Restaurant").trim();
  return { managerProfileName, managerRestaurantName };
}
