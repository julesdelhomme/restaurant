export function getManagerStatsLabels(managerUiLang: string) {
  const soldUnitsLabel =
    managerUiLang === "es" ? "unidades vendidas" : managerUiLang === "de" ? "Portionen verkauft" : "unités vendues";
  const fullSalesInventoryLabel =
    managerUiLang === "es"
      ? "Inventario completo de ventas"
      : managerUiLang === "de"
        ? "Vollständiges Verkaufsinventar"
        : "Inventaire complet des ventes";
  const generatedRevenueLabel =
    managerUiLang === "es" ? "Facturación generada" : managerUiLang === "de" ? "Erzeugter Umsatz" : "CA généré";
  const quantitySoldLabel =
    managerUiLang === "es" ? "Cantidad vendida" : managerUiLang === "de" ? "Verkaufte Menge" : "Quantité vendue";
  const mostProfitableHourLabel =
    managerUiLang === "es" ? "Hora más rentable" : managerUiLang === "de" ? "Profitabelste Stunde" : "Heure la plus rentable";
  const peakOrdersLabel =
    managerUiLang === "es" ? "Pico de pedidos" : managerUiLang === "de" ? "Bestellspitze" : "Pic de commandes";
  const avgRevenuePerHourLabel =
    managerUiLang === "es"
      ? "Facturación media por hora"
      : managerUiLang === "de"
        ? "Durchschnittsumsatz pro Stunde"
        : "Chiffre d'affaires moyen par heure";
  const avgTableDurationLabel =
    managerUiLang === "es"
      ? "Tiempo medio por mesa"
      : managerUiLang === "de"
        ? "Durchschnittliche Tischdauer"
        : "Temps moyen de table";
  const avgOccupationRateLabel =
    managerUiLang === "es"
      ? "Tasa media de ocupación"
      : managerUiLang === "de"
        ? "Durchschnittliche Auslastung"
        : "Taux d'occupation moyen";
  const avgTicketPerCoverLabel =
    managerUiLang === "es"
      ? "Ticket medio por comensal"
      : managerUiLang === "de"
        ? "Durchschnittsbon pro Gast"
        : "Ticket moyen par couvert";
  const avgCoversPerTableLabel =
    managerUiLang === "es"
      ? "Promedio de cubiertos por mesa"
      : managerUiLang === "de"
        ? "Durchschnitt Gäste pro Tisch"
        : "Moyenne de couverts par table";
  const weeklyAverageSummaryLabel =
    managerUiLang === "es"
      ? "Promedio de la semana"
      : managerUiLang === "de"
        ? "Wochendurchschnitt"
        : "Moyenne de la semaine";
  const dailyServiceDetailsLabel =
    managerUiLang === "es"
      ? "Detalle diario (últimos 7 días)"
      : managerUiLang === "de"
        ? "Tagesdetails (letzte 7 Tage)"
        : "Détail journalier (7 derniers jours)";
  const weeklyEvolutionLabel =
    managerUiLang === "es"
      ? "Evolución semanal (30 días)"
      : managerUiLang === "de"
        ? "Wöchentliche Entwicklung (30 Tage)"
        : "Évolution hebdomadaire (30 jours)";
  const dateColumnLabel = managerUiLang === "es" ? "Fecha" : managerUiLang === "de" ? "Datum" : "Date";
  const ordersColumnLabel = managerUiLang === "es" ? "Pedidos" : managerUiLang === "de" ? "Bestellungen" : "Commandes";
  const avgDurationColumnLabel =
    managerUiLang === "es" ? "Tiempo medio mesa" : managerUiLang === "de" ? "Ø Tischdauer" : "Temps moyen table";
  const weekColumnLabel = managerUiLang === "es" ? "Semana" : managerUiLang === "de" ? "Woche" : "Semaine";

  return {
    soldUnitsLabel,
    fullSalesInventoryLabel,
    generatedRevenueLabel,
    quantitySoldLabel,
    mostProfitableHourLabel,
    peakOrdersLabel,
    avgRevenuePerHourLabel,
    avgTableDurationLabel,
    avgOccupationRateLabel,
    avgTicketPerCoverLabel,
    avgCoversPerTableLabel,
    weeklyAverageSummaryLabel,
    dailyServiceDetailsLabel,
    weeklyEvolutionLabel,
    dateColumnLabel,
    ordersColumnLabel,
    avgDurationColumnLabel,
    weekColumnLabel,
  };
}
