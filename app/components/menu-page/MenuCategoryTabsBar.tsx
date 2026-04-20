"use client";

export function MenuCategoryTabsBar(props: any) {
  const {
    categoryTabsRef,
    darkMode,
    categoryTabsScrollRef,
    categoryList,
    setSelectedCategory,
    setSelectedSubCategory,
    selectedCategory,
    bannerBgColor,
    bannerContentTextColor,
    showCategoryScrollHint,
    isCategoryScrollAtEnd,
  } = props;

  return (
    <div
      ref={categoryTabsRef}
      className={`menu-surface-shell border-4 border-black rounded-none p-3 mx-0 my-2 ${!darkMode ? "bg-transparent" : "bg-white/95"}`}
      style={!darkMode ? { backgroundColor: "transparent" } : undefined}
    >
      <div className="relative flex items-center gap-3">
        <div ref={categoryTabsScrollRef} className="flex flex-nowrap gap-3 overflow-x-auto pr-8 w-full">
          {categoryList.map((category: string, index: number) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(index);
                if (index === 0) setSelectedSubCategory("");
              }}
              className={`px-6 py-4 rounded-xl font-black text-xl md:text-2xl border-black whitespace-nowrap transition ${
                selectedCategory === index
                  ? "bg-black text-white border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-black border-2"
              }`}
              style={
                selectedCategory === index
                  ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
                  : undefined
              }
            >
              {category}
            </button>
          ))}
        </div>
        {showCategoryScrollHint && !isCategoryScrollAtEnd ? (
          <div
            className="pointer-events-none absolute top-1/2 right-[10px] h-[78%] w-12 -translate-y-1/2 flex items-center justify-end pr-1"
            style={{
              background: darkMode
                ? "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(17,24,39,0.78) 40%, rgba(17,24,39,0.95) 100%)"
                : "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.78) 40%, rgba(255,255,255,0.95) 100%)",
            }}
            aria-hidden="true"
          >
            <span className={`text-lg font-black ${darkMode ? "text-white" : "text-black"} animate-pulse`}>&rarr;</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
