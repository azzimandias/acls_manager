const BREAK_TAG_PATTERN = /<br\s*\/?>/gi;

export function TableHeaderText({ children }) {
  const parts = String(children ?? '').split(BREAK_TAG_PATTERN);

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {index > 0 ? <br /> : null}
      {part}
    </span>
  ));
}
