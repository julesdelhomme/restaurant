"use client";

import { Euro } from "lucide-react";
import UnifiedDishCardLayout from "../UnifiedDishCardLayout";

export function MenuDishGridSection(props: any) {
  const {
    restaurant,
    scopedRestaurantId,
    restaurantCardDesignerLayout,
    cardLayout,
    darkMode,
    loading,
    tt,
    filteredDishes,
    uiText,
    groupedDishes,
    selectedCategory,
    getPromoPriceForDish,
    toBooleanFlag,
    linkedFormulasByDishId,
    selectedCategoryId,
    FORMULAS_CATEGORY_ID,
    formulaDisplayById,
    getDishName,
    lang,
    getFormulaPackPrice,
    getDishBasePrice,
    parseJsonObject,
    normalizeHexColor,
    cardTextColorValue,
    resolveDesignerShadowPreset,
    clientCardSettings,
    cardSurfaceBg,
    getPromoStateForDish,
    getDescription,
    showCaloriesClient,
    getCaloriesLabel,
    kcalLabel,
    getHungerLevel,
    promoBadgeLabel,
    getDishSuggestionBadge,
    chefSuggestionBadgeLabel,
    getDishStyleBadges,
    availableInFormulaLabel,
    viewDetailsLabel,
    viewFormulaLabel,
    handleSelectDish,
    quickAddToCartEnabled,
    isInteractionDisabled,
    handleQuickAddFromList,
    cardTextIsLight,
    cardVisualStyle,
    dishCardRadiusClass,
    menuLayout,
    hideBrokenImage,
    dishMediaRadiusClass,
    getVisibleDishAllergenLabels,
    getSpicyBadgeLabel,
    bannerBgColor,
    bannerContentTextColor,
    openFormulaModal,
  } = props;

  return (
    <div
      key={`dish-list-${String((restaurant as any | null)?.id || scopedRestaurantId || "unknown")}-${String(restaurantCardDesignerLayout?.layoutToken || cardLayout || "standard")}`}
      className="menu-surface-shell w-full min-w-0 p-3 sm:p-4 grid grid-cols-1 gap-4"
      style={!darkMode ? { backgroundColor: "transparent" } : undefined}
    >
      {loading ? (
        <div className="text-black text-center font-bold py-8">{tt("loading")}</div>
      ) : filteredDishes.length === 0 ? (
        <div className="text-black text-center font-bold py-8">{uiText.noDishes}</div>
      ) : (
        groupedDishes.map((group: any) => (
          <div key={group.title || "default"} className="flex flex-col gap-4">
            {selectedCategory !== 0 && group.title && <h3 className="text-xl font-black text-black mt-2">{group.title}</h3>}
            {group.items.map((dish: any) => {
              const isBicolorCard = cardLayout === "bicolor";
              const isPromoDish = getPromoPriceForDish(dish) != null;
              const isFormulaDishCard = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
              const linkedFormulas = linkedFormulasByDishId.get(String(dish.id || "").trim()) || [];
              const primaryLinkedFormula = linkedFormulas[0] || null;
              const formulaButtonDish = primaryLinkedFormula || (isFormulaDishCard ? dish : null);
              const isFormulasCategorySelected = String(selectedCategoryId || "") === FORMULAS_CATEGORY_ID;
              const formulaDisplay = isFormulasCategorySelected && isFormulaDishCard ? formulaDisplayById.get(String(dish.id || "").trim()) : null;
              const cardDishName = formulaDisplay?.name || getDishName(dish, lang);
              const cardDishImage = formulaDisplay?.imageUrl || dish.image_url;
              const isOverlayCard = cardLayout === "overlay" && Boolean(cardDishImage);
              const displayBasePrice = isFormulasCategorySelected && isFormulaDishCard ? getFormulaPackPrice(dish) : getDishBasePrice(dish);
              const settingsConfig = parseJsonObject((restaurant as any | null)?.settings);
              const globalResolvedLayout = String(settingsConfig.resolved || settingsConfig.layoutToken || settingsConfig.layout_token || "")
                .trim()
                .toLowerCase();
              const activeDesignerLayout = restaurantCardDesignerLayout;
              const layoutToUse = String(globalResolvedLayout || settingsConfig.layoutToken || settingsConfig.layout_token || "standard")
                .trim()
                .toLowerCase();
              const activeDesignerLayoutForRender = activeDesignerLayout
                ? ({
                    ...activeDesignerLayout,
                    resolved: layoutToUse,
                    layoutToken: layoutToUse,
                    layout_token: layoutToUse,
                  } as any)
                : null;
              const activeDesignerGlobalStyle = parseJsonObject(activeDesignerLayout?.globalStyle);
              const activeDesignerElements = parseJsonObject(activeDesignerLayout?.elements);
              const activeDesignerNameStyle = parseJsonObject(parseJsonObject(activeDesignerElements.name).style);
              const designerCardBackground = String(
                activeDesignerGlobalStyle.backgroundGradient || activeDesignerGlobalStyle.backgroundColor || ""
              ).trim();
              const designerCardTextColor = normalizeHexColor(activeDesignerNameStyle.color, cardTextColorValue);
              const designerCardRadius = Number(activeDesignerGlobalStyle.borderRadius);
              const designerCardBorderWidth = Number(activeDesignerGlobalStyle.borderWidth);
              const designerCardBorderStyle = String(activeDesignerGlobalStyle.borderStyle || "").trim();
              const designerCardBorderColor = normalizeHexColor(activeDesignerGlobalStyle.borderColor, "#111111");
              const designerCardShadowPreset = String(activeDesignerGlobalStyle.shadowPreset || "").trim();
              const designerCardShadowRaw = String(activeDesignerGlobalStyle.boxShadow || "").trim();
              const designerCardShadow = designerCardShadowRaw || resolveDesignerShadowPreset(designerCardShadowPreset);
              const settingsCardRadius = Number(clientCardSettings.cardRadius);
              const settingsCardShadow = String(clientCardSettings.cardShadow || "").trim();
              const settingsCardBorder = String(clientCardSettings.cardBorder || "").trim();
              const settingsCardBgColor = String(clientCardSettings.cardBgColor || "").trim();
              const settingsPrimaryColor = String(clientCardSettings.primaryColor || "").trim();
              const cardInlineStyle: any = {
                borderRadius:
                  Number.isFinite(designerCardRadius) && designerCardRadius > 0
                    ? designerCardRadius
                    : Number.isFinite(settingsCardRadius) && settingsCardRadius >= 0
                      ? settingsCardRadius
                      : undefined,
                borderWidth:
                  Number.isFinite(designerCardBorderWidth) && designerCardBorderWidth >= 0
                    ? designerCardBorderWidth
                    : undefined,
                borderStyle: designerCardBorderStyle || undefined,
                borderColor: designerCardBorderColor || settingsPrimaryColor || undefined,
                boxShadow: designerCardShadow || settingsCardShadow || undefined,
                border: settingsCardBorder || undefined,
              };
              if (!isOverlayCard) {
                cardInlineStyle.background = designerCardBackground || settingsCardBgColor || cardSurfaceBg;
                cardInlineStyle.color = designerCardTextColor;
              }
              if (activeDesignerLayoutForRender) {
                const promoState = getPromoStateForDish(dish);
                const promoPriceValue = promoState.promoPrice;
                const displayDescription = getDescription(
                  formulaDisplay && (formulaDisplay as any)?.description
                    ? {
                        ...dish,
                        description: (formulaDisplay as any).description,
                        description_fr: (formulaDisplay as any).description,
                      }
                    : dish,
                  lang
                );
                const caloriesBadge = showCaloriesClient ? getCaloriesLabel(dish, kcalLabel) : "";
                const hungerBadgeLabel = getHungerLevel(dish, lang);
                const dishRecord = dish as unknown as Record<string, unknown>;
                const hasPromoBadge = promoState.isActuallyPromo;
                const inFormulaBadge = Boolean(dishRecord.in_formula ?? dishRecord.is_formula ?? isFormulaDishCard);
                const unifiedBadges: Array<{ key: string; label: string; type: string }> = [
                  ...(hasPromoBadge || promoPriceValue != null ? [{ key: "promo", label: promoBadgeLabel, type: "promo" }] : []),
                  ...(getDishSuggestionBadge(dish) ? [{ key: "suggestion", label: chefSuggestionBadgeLabel, type: "suggestion" }] : []),
                  ...getDishStyleBadges(dish).map((badge: any) => ({ key: badge.key, label: badge.label, type: badge.key })),
                  ...(inFormulaBadge ? [{ key: "in_formula", label: availableInFormulaLabel, type: "in_formula" }] : []),
                  ...(hungerBadgeLabel ? [{ key: "hunger_level", label: hungerBadgeLabel, type: "hunger" }] : []),
                  ...(caloriesBadge ? [{ key: "calories", label: caloriesBadge, type: "calories" }] : []),
                ];
                return (
                  <div key={dish.id} className="flex w-full justify-center">
                    <UnifiedDishCardLayout
                      layout={activeDesignerLayoutForRender}
                      dishName={cardDishName}
                      description={displayDescription}
                      imageUrl={cardDishImage}
                      badges={unifiedBadges}
                      basePrice={Number(displayBasePrice || 0)}
                      promoPrice={promoPriceValue}
                      addToCartLabel={uiText.addToCart}
                      viewDetailsLabel={viewDetailsLabel}
                      formulaLabel={viewFormulaLabel}
                      showFormulaButton={inFormulaBadge}
                      interactive={true}
                      onCardClick={() => handleSelectDish(dish)}
                      onViewDetails={() => handleSelectDish(dish)}
                      onViewFormula={() => handleSelectDish((formulaButtonDish as any) || dish)}
                      onAddToCart={() => {
                        if (!quickAddToCartEnabled || isInteractionDisabled) {
                          handleSelectDish(dish);
                          return;
                        }
                        handleQuickAddFromList(dish);
                      }}
                    />
                  </div>
                );
              }
              const cardTextColor = isOverlayCard ? "text-white" : cardTextIsLight ? "text-white" : "text-black";
              const badgeBaseClass = isOverlayCard
                ? "bg-black/50 border-white/70 text-white backdrop-blur-[1px]"
                : cardTextIsLight
                  ? "bg-white/10 border-white/40 text-white"
                  : "bg-gray-100 border-gray-300 text-black";
              return (
                <div
                  key={dish.id}
                  className={`dish-card-shell ${cardVisualStyle === "sharp" ? "dish-card-sharp" : ""} ${isPromoDish ? "promo-dish-card" : ""} border-4 border-black ${dishCardRadiusClass} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer relative overflow-hidden ${
                    isOverlayCard
                      ? "p-0 flex items-end"
                      : isBicolorCard
                        ? "p-0 flex flex-col sm:flex-row items-stretch"
                        : `p-4 ${menuLayout === "modern_list" ? "flex flex-row gap-3 items-start" : "flex flex-col"}`
                  } w-full min-w-0`}
                  style={cardInlineStyle}
                  onClick={() => handleSelectDish(dish)}
                >
                  {isOverlayCard ? (
                    <>
                      <img
                        src={cardDishImage}
                        alt={cardDishName}
                        className="dish-card-media absolute inset-0 h-full w-full object-cover"
                        style={{ aspectRatio: "4 / 3" }}
                        onError={hideBrokenImage}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    </>
                  ) : null}
                  {!isOverlayCard && !isBicolorCard && cardDishImage ? (
                    <img
                      src={cardDishImage}
                      alt={cardDishName}
                      className={`dish-card-media object-cover ${dishMediaRadiusClass} ${
                        menuLayout === "modern_list" ? "w-24 sm:w-28 shrink-0 aspect-[4/3]" : "w-full aspect-[4/3] mb-3"
                      }`}
                      onError={hideBrokenImage}
                    />
                  ) : null}
                  {!isOverlayCard && isBicolorCard ? (
                    cardDishImage ? (
                      <img
                        src={cardDishImage}
                        alt={cardDishName}
                        className="dish-card-media w-full sm:w-[42%] aspect-[4/3] object-cover"
                        onError={hideBrokenImage}
                      />
                    ) : (
                      <div className="dish-card-media w-full sm:w-[42%] aspect-[4/3] bg-gray-100 border-b-2 sm:border-b-0 sm:border-r-2 border-black" />
                    )
                  ) : null}
                  <div
                    className={`relative z-10 ${
                      isOverlayCard
                        ? "w-full p-4"
                        : isBicolorCard
                          ? "w-full sm:flex-1 min-w-0 p-4 sm:border-l-2 border-black flex flex-col justify-between"
                          : menuLayout === "modern_list"
                            ? "flex-1 min-w-0"
                            : ""
                    } ${cardTextColor}`}
                    style={!isOverlayCard && isBicolorCard ? { background: designerCardBackground || cardSurfaceBg, color: designerCardTextColor } : undefined}
                  >
                    <div className="mb-1">
                      <h4
                        className={`text-lg font-bold ${menuLayout === "modern_list" && !isOverlayCard && !isBicolorCard ? "truncate" : ""} ${isBicolorCard ? "text-xl tracking-wide" : ""}`}
                        title={cardDishName}
                        style={!isOverlayCard ? { color: designerCardTextColor } : undefined}
                      >
                        {cardDishName}
                      </h4>
                      {getPromoPriceForDish(dish) != null || getDishSuggestionBadge(dish) || getDishStyleBadges(dish).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {getPromoPriceForDish(dish) != null && (
                            <span
                              className={`promo-badge-giant inline-flex items-center gap-1 rounded-full font-black border-2 ${
                                isOverlayCard
                                  ? "bg-[#ff2d00] border-white text-white"
                                  : darkMode
                                    ? "bg-[#ff2d00] border-white text-white"
                                    : "bg-[#ffede7] border-[#ff2d00] text-[#c21807]"
                              }`}
                            >
                              {promoBadgeLabel}
                            </span>
                          )}
                          {getDishSuggestionBadge(dish) && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                isOverlayCard
                                  ? "bg-black/70 border-white text-white"
                                  : darkMode
                                    ? "bg-black border-white/20 text-white"
                                    : "bg-gray-100 border-black text-black"
                              }`}
                            >
                              {chefSuggestionBadgeLabel}
                            </span>
                          )}
                          {getDishStyleBadges(dish).map((badge: any) => (
                            <span
                              key={`${dish.id}-${badge.key}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                isOverlayCard
                                  ? "bg-black/45 border-white/60 text-white"
                                  : darkMode
                                    ? "bg-black border-white/20 text-white"
                                    : "bg-white border-black text-black"
                              }`}
                            >
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={`text-sm mb-2 ${
                        isBicolorCard
                          ? `max-w-xl ${cardTextIsLight ? "text-white/85" : "text-gray-700"}`
                          : menuLayout === "modern_list" && !isOverlayCard
                            ? "break-words line-clamp-3"
                            : ""
                      } ${isOverlayCard ? "text-white/90 line-clamp-3" : ""} ${!darkMode && !isOverlayCard ? "text-black" : ""}`}
                      style={!isOverlayCard ? { color: designerCardTextColor } : undefined}
                    >
                      {getDescription(
                        formulaDisplay && (formulaDisplay as any)?.description
                          ? {
                              ...dish,
                              description: (formulaDisplay as any).description,
                              description_fr: (formulaDisplay as any).description,
                            }
                          : dish,
                        lang
                      )}
                    </p>
                    {(() => {
                      const displayDish =
                        formulaDisplay && (formulaDisplay as any)?.calories != null
                          ? {
                              ...dish,
                              calories: (formulaDisplay as any).calories,
                              calories_min: (formulaDisplay as any).calories,
                            }
                          : dish;
                      return (
                        (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                          <div className={`flex flex-wrap gap-3 text-xs font-bold mb-2 ${isBicolorCard ? "" : ""} ${cardTextColor}`}>
                            {getHungerLevel(displayDish, lang) && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${badgeBaseClass}`}>
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                {getHungerLevel(displayDish, lang)}
                              </span>
                            )}
                            {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${badgeBaseClass}`}>
                                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                                {getCaloriesLabel(displayDish, kcalLabel)}
                              </span>
                            )}
                          </div>
                        )
                      );
                    })()}
                    <div className={`flex gap-2 mb-2 flex-wrap ${isBicolorCard ? "" : ""}`}>
                      {dish.is_vegetarian && (
                        <span className={`px-2 py-1 rounded font-bold text-xs border-2 ${isOverlayCard ? "bg-green-700/80 border-white text-white" : "bg-green-200 border-black text-black"}`}>
                          {tt("vegetarian")}
                        </span>
                      )}
                      {getSpicyBadgeLabel(dish, lang) && (
                        <span className={`px-2 py-1 rounded font-bold text-xs border-2 ${isOverlayCard ? "bg-red-700/80 border-white text-white" : "bg-red-200 border-black text-black"}`}>
                          {getSpicyBadgeLabel(dish, lang)}
                        </span>
                      )}
                      {getVisibleDishAllergenLabels(dish).map((a: string, i: number) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded font-bold text-xs border-2 ${
                            isOverlayCard
                              ? "bg-black/45 border-yellow-300 text-yellow-200"
                              : darkMode
                                ? "bg-transparent border-yellow-400 text-yellow-300"
                                : "bg-yellow-200 border-black text-black"
                          }`}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                    {linkedFormulas.length > 0 || isFormulaDishCard ? (
                      <div className="mb-2 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2 py-1 text-xs font-black text-black">
                        {availableInFormulaLabel}
                      </div>
                    ) : null}
                    <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      {getPromoPriceForDish(dish) != null ? (
                        <div className={`inline-flex items-center gap-2 ${isOverlayCard ? "text-white" : ""}`} style={!isOverlayCard ? { color: designerCardTextColor } : undefined}>
                          <span className="text-sm font-bold line-through opacity-70 inline-flex items-center gap-1">
                            {Number(displayBasePrice || 0).toFixed(2)}
                            <Euro size={14} />
                          </span>
                          <span className="text-3xl md:text-4xl font-black inline-flex items-center gap-1 text-[#ff2d00]">
                            {Number(getPromoPriceForDish(dish) || 0).toFixed(2)}
                            <Euro size={20} />
                          </span>
                        </div>
                      ) : (
                        <span className={`text-2xl md:text-3xl font-black inline-flex items-center gap-1 ${isOverlayCard ? "text-white" : ""}`} style={!isOverlayCard ? { color: designerCardTextColor } : undefined}>
                          {Number(displayBasePrice || 0).toFixed(2)}
                          <Euro size={18} />
                        </span>
                      )}
                      <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:justify-end">
                        {formulaButtonDish && !isInteractionDisabled ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (formulaButtonDish === dish) {
                                openFormulaModal(formulaButtonDish, null);
                                return;
                              }
                              openFormulaModal(formulaButtonDish, dish);
                            }}
                            className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap ${
                              isOverlayCard ? "border-white" : "border-black"
                            }`}
                            style={{
                              backgroundColor: isOverlayCard ? "#FFF8E1" : "#FFF8E1",
                              color: "#111111",
                            }}
                          >
                            {viewFormulaLabel} ({getFormulaPackPrice(formulaButtonDish).toFixed(2)} &euro;)
                          </button>
                        ) : null}
                        {quickAddToCartEnabled ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleQuickAddFromList(dish);
                            }}
                            className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap ${
                              isOverlayCard ? "border-white" : "border-black"
                            }`}
                            style={{
                              backgroundColor: isOverlayCard ? "#FFFFFF" : bannerBgColor,
                              color: isOverlayCard ? "#111111" : bannerContentTextColor,
                            }}
                            aria-label={uiText.addToCart}
                            title={uiText.addToCart}
                          >
                            {uiText.addToCart}
                          </button>
                        ) : null}
                        <span
                          className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 whitespace-nowrap ${
                            isOverlayCard ? "border-white" : "border-black"
                          }`}
                          style={{
                            backgroundColor: isOverlayCard ? "rgba(0,0,0,0.25)" : darkMode ? "#000000" : "rgba(255,255,255,0.65)",
                            color: darkMode ? "#FFFFFF" : isOverlayCard ? "#FFFFFF" : "#111111",
                          }}
                        >
                          {viewDetailsLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
