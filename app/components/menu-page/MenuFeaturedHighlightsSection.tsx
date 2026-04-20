"use client";

import { Euro } from "lucide-react";

export function MenuFeaturedHighlightsSection(props: any) {
  const {
    shouldShowHeroSection,
    featuredHighlights,
    linkedFormulasByDishId,
    toBooleanFlag,
    cardLayout,
    cardSurfaceBg,
    darkMode,
    consultationModeClient,
    handleSelectDish,
    cardTextColorValue,
    getFeaturedLabel,
    cardImagePanelBg,
    hideBrokenImage,
    getDishName,
    lang,
    getPromoPriceForDish,
    promoBadgeLabel,
    getDishStyleBadges,
    getDescription,
    getHungerLevel,
    showCaloriesClient,
    getCaloriesLabel,
    kcalLabel,
    getDishBasePrice,
    isInteractionDisabled,
    openFormulaModal,
    viewFormulaLabel,
    getFormulaPackPrice,
    quickAddToCartEnabled,
    handleQuickAddFromList,
    bannerBgColor,
    bannerContentTextColor,
    uiText,
    clickDetailsLabel,
  } = props;

  if (!shouldShowHeroSection) return null;

  return (
    <div className="mx-0 my-2 space-y-3">
      {featuredHighlights.map((highlight: any) => {
        const featuredDish = highlight.dish;
        const featuredLinkedFormulas = linkedFormulasByDishId.get(String(featuredDish.id || "").trim()) || [];
        const featuredPrimaryFormula = featuredLinkedFormulas[0] || null;
        const isFeaturedFormulaDish = toBooleanFlag((featuredDish as any).is_formula ?? featuredDish.is_formula);
        const featuredFormulaButtonDish = featuredPrimaryFormula || (isFeaturedFormulaDish ? featuredDish : null);
        const primaryType = highlight.types[0] || "daily";
        const featuredOverlay = cardLayout === "overlay" && Boolean(featuredDish.image_url);
        const primaryBackground = cardSurfaceBg;
        return (
          <section
            key={highlight.key}
            className={`border-4 ${darkMode ? "border-[#d99a2b]" : "border-black"} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              consultationModeClient ? "cursor-pointer" : "cursor-pointer"
            }`}
            style={featuredOverlay ? undefined : { backgroundColor: primaryBackground }}
            onClick={() => handleSelectDish(featuredDish)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectDish(featuredDish);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="p-3 sm:p-4">
              <h2
                className={`text-2xl font-black mb-3 ${darkMode ? "text-[#F5F5F5]" : ""}`}
                style={!featuredOverlay ? { color: cardTextColorValue } : undefined}
              >
                {getFeaturedLabel(primaryType)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div
                  className={`relative overflow-hidden rounded-lg border-2 border-black aspect-[4/3] ${featuredOverlay ? "min-h-[240px] sm:min-h-[280px]" : ""}`}
                  style={{ backgroundColor: cardImagePanelBg }}
                >
                  {featuredDish.image_url ? (
                    <img
                      src={featuredDish.image_url}
                      alt={getDishName(featuredDish, lang)}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={hideBrokenImage}
                    />
                  ) : (
                    <div className="absolute inset-0 h-full w-full bg-gray-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {highlight.types.map((badgeType: string) => (
                      <span
                        key={`${highlight.key}-${badgeType}`}
                        className={`text-xs md:text-sm font-black px-3 py-1 rounded-full border-2 border-white ${
                          badgeType === "daily" ? "bg-green-700 text-white" : "bg-amber-500 text-black"
                        }`}
                      >
                        {getFeaturedLabel(badgeType)}
                      </span>
                    ))}
                    {getPromoPriceForDish(featuredDish) != null && (
                      <span className="promo-badge-giant font-black rounded-full border-2 border-white bg-[#ff2d00] text-white">
                        {promoBadgeLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-between">
                  <div className={`rounded-lg p-4 border-2 border-black ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}>
                    <div className="mb-2">
                      <h3 className="text-3xl md:text-4xl font-black" style={!darkMode ? { color: cardTextColorValue } : undefined}>
                        {getDishName(featuredDish, lang)}
                      </h3>
                      {getDishStyleBadges(featuredDish).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getDishStyleBadges(featuredDish).map((badge: any) => (
                            <span
                              key={`featured-${featuredDish.id}-${badge.key}`}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${darkMode ? "border-white/30 bg-black text-white" : "border-black bg-white text-black"}`}
                            >
                              <span className={`inline-block w-2 h-2 rounded-full ${badge.dotClass}`} />
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={`text-base md:text-lg leading-relaxed mb-4 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                      style={!darkMode ? { color: cardTextColorValue } : undefined}
                    >
                      {getDescription(
                        featuredPrimaryFormula
                          ? {
                              ...featuredDish,
                              description: (featuredPrimaryFormula as any).description || featuredDish.description,
                              description_fr: (featuredPrimaryFormula as any).description || featuredDish.description_fr,
                            }
                          : featuredDish,
                        lang
                      )}
                    </p>
                    {(() => {
                      const displayDish = featuredPrimaryFormula
                        ? {
                            ...featuredDish,
                            calories: (featuredPrimaryFormula as any).calories || featuredDish.calories,
                            calories_min: (featuredPrimaryFormula as any).calories_min || featuredDish.calories_min,
                          }
                        : featuredDish;
                      return (
                        (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {getHungerLevel(displayDish, lang) && (
                              <span className="inline-flex items-center gap-2 bg-white/95 text-black border border-black rounded-full px-3 py-1.5 text-sm md:text-base font-bold">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                                {getHungerLevel(displayDish, lang)}
                              </span>
                            )}
                            {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) && (
                              <span className="inline-flex items-center gap-2 bg-white/95 text-black border border-black rounded-full px-3 py-1.5 text-sm md:text-base font-bold">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" />
                                {getCaloriesLabel(displayDish, kcalLabel)}
                              </span>
                            )}
                          </div>
                        )
                      );
                    })()}
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    {getPromoPriceForDish(featuredDish) != null ? (
                      <div
                        className="inline-flex items-center gap-2"
                        style={{ color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : cardTextColorValue }}
                      >
                        <span className="text-xl font-bold line-through opacity-70 inline-flex items-center gap-1">
                          {Number(getDishBasePrice(featuredDish) || 0).toFixed(2)}
                          <Euro size={16} />
                        </span>
                        <span className="text-5xl font-black inline-flex items-center gap-1 text-[#ff2d00]">
                          {Number(getPromoPriceForDish(featuredDish) || 0).toFixed(2)}
                          <Euro size={28} />
                        </span>
                      </div>
                    ) : (
                      <span
                        className="text-4xl font-black inline-flex items-center gap-1"
                        style={{ color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : cardTextColorValue }}
                      >
                        {Number(getDishBasePrice(featuredDish) || 0).toFixed(2)}
                        <Euro size={24} />
                      </span>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                      {featuredFormulaButtonDish && !isInteractionDisabled ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (featuredFormulaButtonDish === featuredDish) {
                              openFormulaModal(featuredFormulaButtonDish, null);
                              return;
                            }
                            openFormulaModal(featuredFormulaButtonDish, featuredDish);
                          }}
                          className="text-sm md:text-base font-black px-4 py-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap shrink-0"
                          style={{ backgroundColor: "#FFF8E1", color: "#111111" }}
                        >
                          {viewFormulaLabel} ({getFormulaPackPrice(featuredFormulaButtonDish).toFixed(2)} &euro;)
                        </button>
                      ) : null}
                      {quickAddToCartEnabled ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleQuickAddFromList(featuredDish);
                          }}
                          className="text-sm md:text-base font-black px-4 py-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap shrink-0"
                          style={{ backgroundColor: bannerBgColor, color: bannerContentTextColor }}
                        >
                          {uiText.addToCart}
                        </button>
                      ) : null}
                      <span
                        className="text-sm md:text-base font-black px-4 py-2 rounded-lg border-2 whitespace-nowrap"
                        style={{
                          borderColor: featuredOverlay ? "rgba(255,255,255,0.9)" : "#000000",
                          color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : "#111111",
                          backgroundColor: featuredOverlay ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)",
                        }}
                      >
                        {clickDetailsLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
