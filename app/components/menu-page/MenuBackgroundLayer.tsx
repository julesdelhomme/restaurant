"use client";

type MenuBackgroundLayerProps = {
  darkMode: boolean;
  backgroundImageUrl: string;
  backgroundOpacity: number;
  bannerBgColor: string;
};

export function MenuBackgroundLayer({
  darkMode,
  backgroundImageUrl,
  backgroundOpacity,
  bannerBgColor,
}: MenuBackgroundLayerProps) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[-10] menu-client-bg-content"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          minHeight: "100dvh",
          zIndex: -10,
          marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundImage: !darkMode && backgroundImageUrl ? `url(${backgroundImageUrl})` : "none",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          opacity: !darkMode && backgroundImageUrl ? backgroundOpacity : 1,
          backgroundColor: darkMode ? "#000000" : bannerBgColor,
          transform: "none",
          transition: "none",
        }}
      />
      <div className={`absolute inset-0 z-[-1] pointer-events-none ${darkMode ? "bg-black/94" : "bg-transparent"}`} />
    </>
  );
}
