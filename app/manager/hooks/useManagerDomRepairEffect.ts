import { useEffect } from "react";

export function useManagerDomRepairEffect(deps: Record<string, any>) {
  const { repairMojibakeUiText } = deps;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.body;
    const repairDom = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const node = current as Text;
        const original = node.nodeValue || "";
        const repaired = repairMojibakeUiText(original);
        if (repaired !== original) node.nodeValue = repaired;
        current = walker.nextNode();
      }

      root.querySelectorAll("[placeholder],[title],[alt],[aria-label]").forEach((el) => {
        ["placeholder", "title", "alt", "aria-label"].forEach((attr) => {
          const raw = el.getAttribute(attr);
          if (!raw) return;
          const repaired = repairMojibakeUiText(raw);
          if (repaired !== raw) el.setAttribute(attr, repaired);
        });
      });
    };

    repairDom();
    const observer = new MutationObserver(() => repairDom());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
}
