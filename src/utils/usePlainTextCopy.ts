import { useEffect } from "react";

export default function usePlainTextCopy(ref) {
  useEffect(() => {
    const onCopy = (e) => {
      const root = ref.current;
      if (!root) return;

      const sel = window.getSelection();
      if (!sel) return;
      const text = sel.toString();
      if (!text.trim()) return;

      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (!anchor || !focus) return;
      if (!root.contains(anchor) || !root.contains(focus)) return;

      e.preventDefault();
      e.clipboardData.setData("text/plain", text);
    };

    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [ref]);
}
