"use client";

export function MenuCategoryDrawer(props: any) {
  const {
    categoryDrawerEnabled,
    isCategoryDrawerOpen,
    setIsCategoryDrawerOpen,
    uiText,
    categoryList,
    selectedCategory,
    setSelectedCategory,
    setSelectedSubCategory,
  } = props;

  if (!categoryDrawerEnabled || !isCategoryDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        onClick={() => setIsCategoryDrawerOpen(false)}
        aria-label={uiText.close}
      />
      <aside className="absolute left-0 top-0 h-full w-[78%] max-w-[320px] bg-white border-r-4 border-black p-4 pt-6 shadow-[6px_0_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-black text-lg">{uiText.categoriesTitle}</span>
          <button
            type="button"
            onClick={() => setIsCategoryDrawerOpen(false)}
            className="px-2 py-1 border-2 border-black font-black"
          >
            {uiText.close}
          </button>
        </div>
        <div className="space-y-2">
          {categoryList.map((category: string, index: number) => (
            <button
              key={`drawer-${category}`}
              type="button"
              onClick={() => {
                setSelectedCategory(index);
                if (index === 0) setSelectedSubCategory("");
                setIsCategoryDrawerOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-black border-2 ${
                selectedCategory === index ? "bg-black text-white border-black" : "bg-white text-black border-black"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
