"use client";

export function MenuSubCategoryTabs(props: any) {
  const {
    selectedCategory,
    availableSubCategories,
    darkMode,
    selectedSubCategory,
    setSelectedSubCategory,
    bannerBgColor,
    bannerContentTextColor,
    uiText,
    getSubCategoryLabel,
  } = props;

  if (selectedCategory === 0 || availableSubCategories.length === 0) return null;

  return (
    <div
      className={`menu-surface-shell border-4 border-black rounded-none p-3 mx-0 mb-2 ${!darkMode ? "bg-transparent" : "bg-white/95"}`}
      style={!darkMode ? { backgroundColor: "transparent" } : undefined}
    >
      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedSubCategory("")}
          className={`px-3 py-1 rounded-full font-black text-sm border-2 border-black text-black whitespace-nowrap ${
            !selectedSubCategory ? "bg-black text-white" : "bg-white"
          }`}
          style={
            !selectedSubCategory
              ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
              : undefined
          }
        >
          {uiText.labels.all}
        </button>
        {availableSubCategories.map((sub: any) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubCategory(String(sub.id))}
            className={`px-3 py-1 rounded-full font-black text-sm border-2 border-black text-black whitespace-nowrap ${
              selectedSubCategory === String(sub.id) ? "bg-black text-white" : "bg-white"
            }`}
            style={
              selectedSubCategory === String(sub.id)
                ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
                : undefined
            }
          >
            {getSubCategoryLabel(sub)}
          </button>
        ))}
      </div>
    </div>
  );
}
