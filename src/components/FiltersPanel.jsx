export function FiltersPanel({ id, title, visible, children }) {
  return (
    <aside id={id} className="access-sider ui-card" aria-labelledby={`${id}-title`} hidden={!visible}>
      <h2 id={`${id}-title`} className="ui-card-heading">{title}</h2>
      <div className="access-filters ui-card-body">{children}</div>
    </aside>
  );
}
