import { useEffect } from "react";

export function useMojibakeRepair(repairText: (value: string) => string) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.body;
    const repairDom = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const node = current as Text;
        const raw = node.nodeValue || "";
        const repaired = repairText(raw);
        if (repaired !== raw) node.nodeValue = repaired;
        current = walker.nextNode();
      }
      root.querySelectorAll("[placeholder],[title],[alt],[aria-label]").forEach((element) => {
        ["placeholder", "title", "alt", "aria-label"].forEach((attribute) => {
          const raw = element.getAttribute(attribute);
          if (!raw) return;
          const repaired = repairText(raw);
          if (repaired !== raw) element.setAttribute(attribute, repaired);
        });
      });
    };
    repairDom();
    const observer = new MutationObserver(() => repairDom());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [repairText]);
}
