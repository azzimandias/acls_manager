import { useLayoutEffect, useRef, useState } from 'react';

export function TableSkeleton({ columns, minWidth = 0, matrixColumnWidth }) {
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({ width: 0, rows: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const styles = window.getComputedStyle(container);
    const headingHeight = parseFloat(styles.getPropertyValue('--ui-heading-height'));
    const rowHeight = parseFloat(styles.getPropertyValue('--ui-row-height'));

    const measure = () => {
      const { width, height } = container.getBoundingClientRect();
      const rows = Math.ceil((height - headingHeight) / rowHeight);
      setLayout({ width, rows });
    };

    measure();
    const observer = new window.ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isMatrix = matrixColumnWidth != null;
  const knownWidth = columns.reduce((total, column) => total + (column.width ?? 0), 0);
  const extraColumns = isMatrix
    ? Math.max(0, Math.ceil((layout.width - knownWidth) / matrixColumnWidth))
    : 0;
  const visibleColumns = [
    ...columns,
    ...Array.from({ length: extraColumns }, (_, index) => ({
      key: `placeholder-${index}`,
      width: matrixColumnWidth,
      align: 'center',
    })),
  ];
  const width = isMatrix ? knownWidth + extraColumns * matrixColumnWidth : Math.max(layout.width, minWidth);
  const rowCount = Math.max(0, layout.rows - (isMatrix ? 1 : 0));

  return (
    <div className={isMatrix ? 'table-skeleton table-skeleton--matrix' : 'table-skeleton'} role="status" ref={containerRef}>
      <span className="table-skeleton__status">Загрузка таблицы…</span>
      <table className="ui-table" aria-hidden="true" style={{ width }}>
        <colgroup>
          {visibleColumns.map((column) => <col key={column.key ?? column.dataIndex} style={{ width: column.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {visibleColumns.map((column) => (
              <th key={column.key ?? column.dataIndex} scope="col">
                {typeof column.title === 'string' ? column.title : <span className="table-skeleton__mark" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isMatrix && (
            <tr className="table-skeleton__department">
              <td colSpan={visibleColumns.length}>
                <span className="table-skeleton__mark" />
              </td>
            </tr>
          )}
          {Array.from({ length: rowCount }, (_, index) => (
            <tr key={index}>
              {visibleColumns.map((column) => (
                <td
                  key={column.key ?? column.dataIndex}
                  className={isMatrix && column.align === 'center' ? 'table-skeleton__check' : undefined}
                >
                  <span className="table-skeleton__mark" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
