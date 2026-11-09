export function insertAtCursor(element, text, currentValue, onChange, cursorOffset = text.length, selectLength = 0) {
  if (!element) return;

  const start = element.selectionStart ?? currentValue.length;
  const end = element.selectionEnd ?? start;
  const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);

  onChange(newValue);

  const cursorPos = start + cursorOffset;
  const selectionEnd = cursorPos + selectLength;
  requestAnimationFrame(() => {
    element.focus();
    element.setSelectionRange(cursorPos, selectionEnd);
  });
}
