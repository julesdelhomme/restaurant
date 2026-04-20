"use client";

type MenuStatusToastsProps = {
  serverCallMsg: string;
  toastMessage: string;
};

export function MenuStatusToasts({ serverCallMsg, toastMessage }: MenuStatusToastsProps) {
  return (
    <>
      {serverCallMsg ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/90 text-white border border-white/20 px-4 py-2 rounded-full font-bold text-sm z-50 shadow-lg backdrop-blur-sm">
          {serverCallMsg}
        </div>
      ) : null}
      {toastMessage ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full font-bold z-50 animate-pulse">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}
