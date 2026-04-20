// @ts-nocheck
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ManagerStatsPanelProps = {
  [key: string]: any;
};

export default function ManagerStatsPanel(props: ManagerStatsPanelProps) {
  const {
    activeManagerTab = "menu",
    analyticsRange = "today",
    analyticsTab = "live",
    analyticsText = {
      title: "Statistiques",
      today: "Aujourd'hui",
      last7Days: "7 jours",
      last30Days: "30 jours",
      liveTab: "Live",
      productTab: "Produits",
      trendsTab: "Tendances",
      opsTab: "Operations",
      realRevenue: "CA",
      tipsTotal: "Tips",
      averageBasket: "Panier",
      tableState: "Tables",
      occupiedTables: "Occupees",
      freeTables: "Libres",
      top5: "Top 5",
      noData: "Aucune donnee",
      topRevenue: "Top CA",
      productMix: "Mix produit",
      recommendationConversion: "Ventes via Recommandation",
      recommendationItems: "Ventes via Recommandation",
      tablePerformance: "Performance tables",
      revenue: "CA",
      salesByWeek: "CA hebdo",
    },
    avgCoversPerTableLabel = "Couverts/table",
    avgDurationColumnLabel = "Duree moyenne",
    avgOccupationRateLabel = "Occupation",
    avgRevenuePerHourLabel = "CA/heure",
    avgTableDurationLabel = "Duree table",
    avgTicketPerCoverLabel = "Ticket/couvert",
    dailyServiceDetailsLabel = "Details service",
    dateColumnLabel = "Date",
    displayedAnalytics = {
      realRevenue: 0,
      totalTips: 0,
      averageBasket: 0,
      tableStateData: [],
      totalTables: 0,
      averageOccupationRate: 0,
      occupationByTimeSlots: [],
      averageTicketPerCover: 0,
      totalCoversServed: 0,
      averageCoversPerTable: 0,
      totalServedTableSessionsWithCovers: 0,
      top5: [],
      topRevenue5: [],
      allProductSales: [],
      topProductsTimelineData: [],
      productMixData: [],
      tablePerformance: [],
      averageTableDurationMinutes: 0,
      recommendationConversion: 0,
      recommendationSoldItems: 0,
      recentOrderHistory: [],
      weeklyRangeSummary: { averageRevenuePerDay: 0, averageOrdersPerDay: 0, averageTableDurationMinutes: 0 },
      dailyServicePerformanceData: [],
      weeklyServicePerformanceData: [],
      salesTrendTitle: "Evolution",
      bestRevenueSlot: null,
      peakOrdersSlot: null,
      averageRevenuePerHour: 0,
      salesTrendData: [],
    },
    formatEuro = (value: number) => `${Number(value || 0).toFixed(2)} EUR`,
    fullSalesInventoryLabel = "Inventaire ventes",
    generatedRevenueLabel = "CA genere",
    handleCloseMonthAndPurge = () => undefined,
    handleExportMonthlyReportPdfArchive = () => undefined,
    isPurgingHistory = false,
    monthlyCloseEnabled = false,
    mostProfitableHourLabel = "Heure la plus rentable",
    ordersColumnLabel = "Commandes",
    peakOrdersLabel = "Pic commandes",
    quantitySoldLabel = "Quantite vendue",
    SafeResponsiveContainer = ({ children }: any) => children,
    setAnalyticsRange = () => undefined,
    setAnalyticsTab = () => undefined,
    soldUnitsLabel = "ventes",
    weekColumnLabel = "Semaine",
    weeklyAverageSummaryLabel = "Moyenne hebdo",
    weeklyEvolutionLabel = "Evolution hebdo",
  } = props;

  return (
          <div className={`${activeManagerTab === "stats" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4" : "hidden"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-black">{analyticsText.title}</h2>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("today")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "today" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("7d")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "7d" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.last7Days}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("30d")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "30d" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.last30Days}
                  </button>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportMonthlyReportPdfArchive()}
                    className="px-3 py-1.5 rounded-lg border text-sm font-black bg-blue-600 text-white border-blue-700"
                  >
                    Exporter le rapport mensuel (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseMonthAndPurge}
                    disabled={!monthlyCloseEnabled}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-black ${
                      monthlyCloseEnabled
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                    }`}
                  >
                  {isPurgingHistory ? "Purge en cours..." : "Clôturer le mois et purger les données"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  La clôture mensuelle est activée après téléchargement du PDF et avec le filtre 30 jours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { id: "live", label: analyticsText.liveTab },
                { id: "product", label: analyticsText.productTab },
                { id: "trends", label: analyticsText.trendsTab },
                { id: "ops", label: analyticsText.opsTab },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAnalyticsTab(tab.id as "live" | "product" | "trends" | "ops")}
                  className={`px-3 py-2 rounded-lg border text-sm font-black ${
                    analyticsTab === tab.id
                      ? "bg-orange-500 text-white border-orange-600"
                      : "bg-white text-black border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {analyticsTab === "live" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <div className="text-sm font-bold text-green-900">{analyticsText.realRevenue}</div>
                    <div className="text-2xl font-black text-green-700">{formatEuro(displayedAnalytics.realRevenue)}</div>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                    <div className="text-sm font-bold text-rose-900">{analyticsText.tipsTotal}</div>
                    <div className="text-2xl font-black text-rose-700">{formatEuro(displayedAnalytics.totalTips || 0)}</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <div className="text-sm font-bold text-blue-900">{analyticsText.averageBasket}</div>
                    <div className="text-2xl font-black text-blue-700">{formatEuro(displayedAnalytics.averageBasket)}</div>
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <div className="text-sm font-bold text-purple-900">{analyticsText.tableState}</div>
                    <div className="text-2xl font-black text-purple-700">
                      {displayedAnalytics.tableStateData.find((row: { name: string; value: number }) => row.name === analyticsText.occupiedTables)?.value || 0}/{displayedAnalytics.totalTables}
                    </div>
                    <p className="mt-1 text-xs font-bold text-purple-800">
                      {avgOccupationRateLabel}: {displayedAnalytics.averageOccupationRate.toFixed(1)}%
                    </p>
                    {Array.isArray(displayedAnalytics.occupationByTimeSlots) ? (
                      <div className="mt-2 space-y-1">
                        {displayedAnalytics.occupationByTimeSlots.map(
                          (slot: { id: string; label: string; occupancyRate: number }) => (
                            <p key={`live-occupation-slot-${slot.id}`} className="text-[11px] font-semibold text-purple-900">
                              {slot.label}: {Number(slot.occupancyRate || 0).toFixed(1)}%
                            </p>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="text-sm font-bold text-amber-900">{avgTicketPerCoverLabel}</div>
                    <div className="text-2xl font-black text-amber-700">{formatEuro(displayedAnalytics.averageTicketPerCover)}</div>
                    <p className="mt-1 text-xs font-bold text-amber-800">
                      Couverts: {Number(displayedAnalytics.totalCoversServed || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-4">
                    <div className="text-sm font-bold text-cyan-900">{avgCoversPerTableLabel}</div>
                    <div className="text-2xl font-black text-cyan-700">
                      {Number(displayedAnalytics.averageCoversPerTable || 0).toFixed(1)}
                    </div>
                    <p className="mt-1 text-xs font-bold text-cyan-800">
                      Commandes: {Number(displayedAnalytics.totalServedTableSessionsWithCovers || 0)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-3">{analyticsText.tableState}</h3>
                  {displayedAnalytics.totalTables === 0 ? (
                    <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                  ) : (
                    <div className="h-64 min-w-0">
                      <SafeResponsiveContainer>
                        <PieChart>
                          <Pie data={displayedAnalytics.tableStateData} dataKey="value" nameKey="name" outerRadius={90}>
                            {displayedAnalytics.tableStateData.map((entry: { name: string; value: number }) => (
                              <Cell
                                key={`live-table-state-${entry.name}`}
                                fill={entry.name === analyticsText.freeTables ? "#22c55e" : "#f97316"}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analyticsTab === "product" && (
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${analyticsRange === "today" ? "md:grid-cols-1" : "md:grid-cols-2"} gap-4`}>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{analyticsText.top5}</h3>
                    {displayedAnalytics.top5.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {displayedAnalytics.top5.map((dish, index) => (
                          <div key={`top-${dish.name}-${index}`} className="flex justify-between">
                            <span className="font-semibold">{index + 1}. {dish.name}</span>
                            <span>{dish.count} {soldUnitsLabel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {analyticsRange !== "today" ? (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <h3 className="font-black mb-2">{analyticsText.topRevenue}</h3>
                      {displayedAnalytics.topRevenue5.length === 0 ? (
                        <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {displayedAnalytics.topRevenue5.map((dish, index) => (
                            <div key={`top-revenue-${dish.name}-${index}`} className="flex justify-between gap-2">
                              <span className="font-semibold truncate">{index + 1}. {dish.name}</span>
                              <span className="whitespace-nowrap">{formatEuro(dish.revenue)} ({dish.count} {soldUnitsLabel})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <details className="rounded-xl border border-gray-200 p-4">
                  <summary className="cursor-pointer font-black">{fullSalesInventoryLabel}</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-200">
                          <th className="py-2 pr-3">Produit</th>
                          <th className="py-2 pr-3">{quantitySoldLabel}</th>
                          <th className="py-2">{generatedRevenueLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedAnalytics.allProductSales.length === 0 ? (
                          <tr>
                            <td className="py-3 text-gray-600" colSpan={3}>{analyticsText.noData}</td>
                          </tr>
                        ) : (
                          displayedAnalytics.allProductSales.map((item: { name: string; count: number; revenue: number }, index: number) => (
                            <tr key={`inventory-sales-${item.name}-${index}`} className="border-b border-gray-100">
                              <td className="py-2 pr-3">{item.name}</td>
                              <td className="py-2 pr-3">{item.count} {soldUnitsLabel}</td>
                              <td className="py-2">{formatEuro(item.revenue)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
                {analyticsRange !== "today" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">Évolution des Top Produits (volume)</h3>
                    {displayedAnalytics.topProductsTimelineData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <div className="h-72 min-w-0">
                        <SafeResponsiveContainer>
                          <BarChart data={displayedAnalytics.topProductsTimelineData}>
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f97316" />
                          </BarChart>
                        </SafeResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{analyticsText.productMix}</h3>
                    <div className="h-64 min-w-0">
                      <SafeResponsiveContainer>
                        <PieChart>
                          <Pie data={displayedAnalytics.productMixData} dataKey="value" nameKey="name" outerRadius={90}>
                            {displayedAnalytics.productMixData.map((entry, index) => (
                              <Cell
                                key={`mix-${entry.name}`}
                                fill={["#0ea5e9", "#f97316", "#eab308", "#14b8a6"][index % 4]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </SafeResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analyticsTab === "ops" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">{analyticsText.tablePerformance}</h3>
                  {displayedAnalytics.tablePerformance.length === 0 ? (
                    <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                  ) : (
                    <div className="h-72 min-w-0">
                      <SafeResponsiveContainer>
                        <BarChart data={displayedAnalytics.tablePerformance}>
                          <XAxis dataKey="table" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#22c55e" />
                        </BarChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <div className="text-sm font-bold text-blue-900">{avgTableDurationLabel}</div>
                    <div className="text-2xl font-black text-blue-700">
                      {Number(displayedAnalytics.averageTableDurationMinutes || 0).toFixed(2)} min
                    </div>
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <div className="text-sm font-bold text-purple-900">{avgOccupationRateLabel}</div>
                    <div className="text-2xl font-black text-purple-700">
                      {displayedAnalytics.averageOccupationRate.toFixed(1)}%
                    </div>
                    {Array.isArray(displayedAnalytics.occupationByTimeSlots) ? (
                      <div className="mt-2 space-y-1">
                        {displayedAnalytics.occupationByTimeSlots.map(
                          (slot: { id: string; label: string; occupancyRate: number }) => (
                            <p key={`ops-occupation-slot-${slot.id}`} className="text-[11px] font-semibold text-purple-900">
                              {slot.label}: {Number(slot.occupancyRate || 0).toFixed(1)}%
                            </p>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="text-sm font-bold text-emerald-900">{analyticsText.recommendationConversion}</div>
                    <div className="text-2xl font-black text-emerald-700">
                      {Number(displayedAnalytics.recommendationSoldItems || 0)}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">Historique des commandes (couverts)</h3>
                  {Array.isArray(displayedAnalytics.recentOrderHistory) &&
                  displayedAnalytics.recentOrderHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="py-2 pr-3">Date</th>
                            <th className="py-2 pr-3">Table</th>
                            <th className="py-2 pr-3">Couverts</th>
                            <th className="py-2 pr-3">Statut</th>
                            <th className="py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAnalytics.recentOrderHistory.map(
                            (
                              row: {
                                id: string;
                                tableLabel: string;
                                covers: number;
                                total: number;
                                orderTotal: number;
                                tipAmount: number;
                                status: string;
                                createdAtLabel: string;
                              },
                              index: number
                            ) => (
                              <tr key={`history-covers-${row.id || index}-${index}`} className="border-b border-gray-100">
                                <td className="py-2 pr-3 whitespace-nowrap">{row.createdAtLabel}</td>
                                <td className="py-2 pr-3">{row.tableLabel}</td>
                                <td className="py-2 pr-3 font-bold">{row.covers > 0 ? row.covers : "-"}</td>
                                <td className="py-2 pr-3">{row.status}</td>
                                <td className="py-2 whitespace-nowrap">
                                  <div className="font-bold">{formatEuro(row.total)}</div>
                                  {Number(row.tipAmount || 0) > 0 ? (
                                    <div className="text-xs text-gray-600">
                                      Commande {formatEuro(row.orderTotal)} + Pourboire {formatEuro(row.tipAmount)}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Aucune commande sur la période sélectionnée.</p>
                  )}
                </div>
              </div>
            )}

            {analyticsTab === "trends" && (
              <div className="space-y-4">
                {analyticsRange === "7d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-1">{weeklyAverageSummaryLabel}</h3>
                    <p className="text-xs text-gray-600 mb-3">{dailyServiceDetailsLabel}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <div className="text-xs font-bold text-green-900">{analyticsText.revenue}</div>
                        <div className="text-base font-black text-green-700">
                          {formatEuro(displayedAnalytics.weeklyRangeSummary.averageRevenuePerDay)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <div className="text-xs font-bold text-blue-900">{ordersColumnLabel}</div>
                        <div className="text-base font-black text-blue-700">
                          {Number(displayedAnalytics.weeklyRangeSummary.averageOrdersPerDay || 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                        <div className="text-xs font-bold text-purple-900">{avgDurationColumnLabel}</div>
                        <div className="text-base font-black text-purple-700">
                          {Number(displayedAnalytics.weeklyRangeSummary.averageTableDurationMinutes || 0).toFixed(2)} min
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analyticsRange === "7d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{dailyServiceDetailsLabel}</h3>
                    {displayedAnalytics.dailyServicePerformanceData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <>
                        <div className="h-72 min-w-0">
                          <SafeResponsiveContainer>
                            <ComposedChart data={displayedAnalytics.dailyServicePerformanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="revenue" name={analyticsText.revenue} fill="#16a34a" />
                              <Line yAxisId="right" type="monotone" dataKey="orders" name={ordersColumnLabel} stroke="#2563eb" strokeWidth={2} />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="averageTableDurationMinutes"
                                name={avgDurationColumnLabel}
                                stroke="#7c3aed"
                                strokeWidth={2}
                              />
                            </ComposedChart>
                          </SafeResponsiveContainer>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left">
                                <th className="py-2 pr-3">{dateColumnLabel}</th>
                                <th className="py-2 pr-3">{analyticsText.revenue}</th>
                                <th className="py-2 pr-3">{ordersColumnLabel}</th>
                                <th className="py-2">{avgDurationColumnLabel}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedAnalytics.dailyServicePerformanceData.map(
                                (
                                  row: {
                                    label: string;
                                    dateLabel: string;
                                    revenue: number;
                                    orders: number;
                                    averageTableDurationMinutes: number;
                                  },
                                  index: number
                                ) => (
                                  <tr key={`daily-service-${row.label}-${index}`} className="border-b border-gray-100">
                                    <td className="py-2 pr-3">{row.dateLabel}</td>
                                    <td className="py-2 pr-3">{formatEuro(row.revenue)}</td>
                                    <td className="py-2 pr-3">{row.orders}</td>
                                    <td className="py-2">{Number(row.averageTableDurationMinutes || 0).toFixed(2)} min</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {analyticsRange === "30d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{weeklyEvolutionLabel}</h3>
                    {displayedAnalytics.weeklyServicePerformanceData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <>
                        <div className="h-72 min-w-0">
                          <SafeResponsiveContainer>
                            <ComposedChart data={displayedAnalytics.weeklyServicePerformanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="revenue" name={analyticsText.salesByWeek} fill="#16a34a" />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="averageTableDurationMinutes"
                                name={avgDurationColumnLabel}
                                stroke="#7c3aed"
                                strokeWidth={2}
                              />
                            </ComposedChart>
                          </SafeResponsiveContainer>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left">
                                <th className="py-2 pr-3">{weekColumnLabel}</th>
                                <th className="py-2 pr-3">{dateColumnLabel}</th>
                                <th className="py-2 pr-3">{analyticsText.revenue}</th>
                                <th className="py-2 pr-3">{ordersColumnLabel}</th>
                                <th className="py-2">{avgDurationColumnLabel}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedAnalytics.weeklyServicePerformanceData.map(
                                (
                                  row: {
                                    label: string;
                                    periodLabel: string;
                                    revenue: number;
                                    orders: number;
                                    averageTableDurationMinutes: number;
                                  },
                                  index: number
                                ) => (
                                  <tr key={`weekly-service-${row.label}-${index}`} className="border-b border-gray-100">
                                    <td className="py-2 pr-3">{row.label}</td>
                                    <td className="py-2 pr-3">{row.periodLabel}</td>
                                    <td className="py-2 pr-3">{formatEuro(row.revenue)}</td>
                                    <td className="py-2 pr-3">{row.orders}</td>
                                    <td className="py-2">{Number(row.averageTableDurationMinutes || 0).toFixed(2)} min</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">{displayedAnalytics.salesTrendTitle}</h3>
                  <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <div className="text-xs font-bold text-blue-900">{mostProfitableHourLabel}</div>
                      <div className="text-base font-black text-blue-700">
                        {displayedAnalytics.bestRevenueSlot?.label || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                      <div className="text-xs font-bold text-orange-900">{peakOrdersLabel}</div>
                      <div className="text-base font-black text-orange-700">
                        {displayedAnalytics.peakOrdersSlot?.label || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                      <div className="text-xs font-bold text-emerald-900">{avgRevenuePerHourLabel}</div>
                      <div className="text-base font-black text-emerald-700">
                        {formatEuro(displayedAnalytics.averageRevenuePerHour)}
                      </div>
                    </div>
                  </div>
                  <div className="h-72 min-w-0">
                    <SafeResponsiveContainer>
                      <LineChart data={displayedAnalytics.salesTrendData}>
                        <XAxis
                          dataKey="label"
                          interval={analyticsRange === "today" ? 1 : 0}
                          height={56}
                          tick={{ fontSize: 11 }}
                          angle={-35}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                      </LineChart>
                    </SafeResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

          </div>
  );
}
