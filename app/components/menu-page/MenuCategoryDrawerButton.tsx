"use client";

type MenuCategoryDrawerButtonProps = {
  show: boolean;
  darkMode: boolean;
  label: string;
  onOpen: () => void;
};

export function MenuCategoryDrawerButton({ show, darkMode, label, onOpen }: MenuCategoryDrawerButtonProps) {
  if (!show) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`fixed left-4 z-[100] inline-flex h-12 w-12 items-center justify-center rounded-xl border backdrop-blur-md shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        darkMode ? "border-zinc-700 bg-zinc-800/50 text-white" : "border-zinc-200 bg-white text-black"
      }`}
      style={{ top: "calc(env(safe-area-inset-top) + 4.5rem)", zIndex: 100 }}
      aria-label={label}
      title={label}
    >
      <span className="flex flex-col gap-1.5" aria-hidden="true">
        <span className="block h-0.5 w-7 bg-current" />
        <span className="block h-0.5 w-7 bg-current" />
        <span className="block h-0.5 w-7 bg-current" />
      </span>
    </button>
  );
}
