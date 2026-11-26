import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, InputNumber, Pagination, Select, Table, Tag } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchAccessChanges } from '../api/access';
import { FiltersPanel } from '../components/FiltersPanel';
import { TableSkeleton } from '../components/TableSkeleton';
import { parsePositiveInteger } from '../routing';

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZES = [10, 25, 50, 100];
const TABLE_MIN_WIDTH = 1070;

const idFilters = [
  ['user_id', 'Кому (ID пользователя)'],
  ['id_resources', 'Право (ID ACL)'],
  ['id_company', 'Компания (ID)'],
  ['actor_id', 'Кто (ID пользователя)'],
];

// The API returns application-local time: format the text without timezone conversion.
const formatDate = (value) => {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}` : value;
};

const columns = [
  { title: 'Когда', dataIndex: 'created_at', width: 170, render: formatDate },
  {
    title: 'Кто', dataIndex: 'actor_name', width: 220,
    render: (value, row) => value || (row.actor_type === 'system' ? 'Система' : row.actor_id ?? '—'),
  },
  {
    title: 'Кому', key: 'user', width: 220,
    render: (_, row) => [row.user_surname, row.user_name].filter(Boolean).join(' ') || row.user_id,
  },
  {
    title: 'Право', key: 'resource', width: 260,
    render: (_, row) => row.resource_label || row.resource_name || row.id_resources,
  },
  { title: 'Компания', dataIndex: 'id_company', width: 100 },
  {
    title: 'Действие', dataIndex: 'action', width: 100,
    render: (value) => (
      <Tag color={value === 'add' ? 'green' : value === 'remove' ? 'red' : undefined}>
        {{ add: 'Выдал', remove: 'Снял' }[value] || value}
      </Tag>
    ),
  },
].map((column) => ({ ...column, ellipsis: true }));

export function HistoryPage({ searchParams, updateSearch }) {
  const [form] = Form.useForm();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = useMemo(() => {
    const actorType = searchParams.get('actor_type');
    const action = searchParams.get('action');
    return {
      ...Object.fromEntries(idFilters.map(([name]) => [name, parsePositiveInteger(searchParams.get(name))])),
      actor_type: ['user', 'system'].includes(actorType) ? actorType : undefined,
      action: ['add', 'remove'].includes(action) ? action : undefined,
    };
  }, [searchParams]);
  const [filtersVisible, setFiltersVisible] = useState(() => Object.values(filters).some(Boolean));
  const page = parsePositiveInteger(searchParams.get('page')) ?? 1;
  const requestedSize = parsePositiveInteger(searchParams.get('per_page'));
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;

  useEffect(() => {
    form.setFieldsValue(filters);
  }, [form, filters]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchAccessChanges({ ...filters, page, per_page: pageSize }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(err.message || 'Не удалось загрузить историю');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, pageSize, reloadCount]);

  return (
    <section className="access-workspace">
      <div className="history-toolbar ui-pagebar ui-pagebar--filters">
        <Button
          size="small"
          type={filtersVisible ? 'primary' : 'default'}
          icon={<FilterOutlined />}
          onClick={() => setFiltersVisible((current) => !current)}
          title={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
          aria-label="Фильтры"
          aria-expanded={filtersVisible}
          aria-controls="history-filters"
          className="access-filter-button"
        >
          <span className="access-filter-button__label">Фильтры</span>
        </Button>
        <Button size="small" icon={<ReloadOutlined />} loading={loading}
          onClick={() => setReloadCount((count) => count + 1)}>Обновить</Button>
      </div>
      {error && <Alert type="error" showIcon message="Ошибка загрузки истории" description={error} />}
      <div className="access-layout">
        <FiltersPanel id="history-filters" title="Фильтры истории" visible={filtersVisible}>
          <Form
            form={form}
            layout="vertical"
            onValuesChange={(_, values) => {
              const validIds = idFilters.every(([name]) =>
                values[name] == null || (Number.isInteger(values[name]) && values[name] > 0),
              );
              if (validIds) updateSearch({ ...values, page: undefined });
            }}
          >
            {idFilters.map(([name, label]) => (
              <Form.Item key={name} name={name} label={label} rules={[
                { type: 'integer', min: 1, message: 'Введите целый положительный ID' },
              ]}>
                <InputNumber min={1} placeholder="Все" className="form-number" />
              </Form.Item>
            ))}
            <Form.Item name="actor_type" label="Тип автора">
              <Select allowClear placeholder="Все" options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'system', label: 'Система' },
              ]} />
            </Form.Item>
            <Form.Item name="action" label="Действие">
              <Select allowClear placeholder="Все" options={[
                { value: 'add', label: 'Выдал' },
                { value: 'remove', label: 'Снял' },
              ]} />
            </Form.Item>
          </Form>
        </FiltersPanel>
        <div className="table-with-pagination">
          <div className="page-table">
            {loading ? (
              <TableSkeleton columns={columns} minWidth={TABLE_MIN_WIDTH} />
            ) : (
              <Table
                bordered size="small" rowKey="id" columns={columns}
                dataSource={result?.data ?? []} pagination={false}
                scroll={{ x: TABLE_MIN_WIDTH, y: '100%' }}
                locale={{ emptyText: error ? 'Журнал не загружен' : 'Изменений не найдено' }}
              />
            )}
          </div>
          <nav className="ui-pagination" aria-label="Страницы истории">
            <Pagination
              align="end"
              current={result?.current_page ?? page}
              pageSize={result?.per_page ?? pageSize}
              total={result?.total ?? 0}
              showQuickJumper
              showSizeChanger
              pageSizeOptions={PAGE_SIZES}
              showTotal={(total) => `Всего: ${total}`}
              disabled={loading || Boolean(error)}
              onChange={(nextPage, nextSize) => updateSearch({
                page: nextSize === pageSize && nextPage > 1 ? nextPage : undefined,
                per_page: nextSize === DEFAULT_PAGE_SIZE ? undefined : nextSize,
              })}
            />
          </nav>
        </div>
      </div>
    </section>
  );
}
