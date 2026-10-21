import { useEffect, useState } from 'react';
import { Alert, Button, Form, InputNumber, Pagination, Select, Space, Table, Tag } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchAccessChanges } from '../api/access';

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
];

export function HistoryPage() {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [query, setQuery] = useState({ page: 1, per_page: 50 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasActiveFilters = Object.entries(query).some(([key, value]) =>
    !['page', 'per_page'].includes(key) && value !== undefined && value !== null && value !== '',
  );
  const isFilterButtonActive = filtersVisible || hasActiveFilters;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    fetchAccessChanges(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить историю');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  return (
    <div className="access-layout">
      <aside id="history-filters" className={`access-sider history-sider ${filtersVisible ? '' : 'access-sider_hidden'}`}>
        <div className="access-filters__title"><FilterOutlined /> Фильтры</div>
      <Form
        layout="vertical"
        className="history-filters"
        onValuesChange={(_, values) => {
          const validIds = idFilters.every(([name]) =>
            values[name] == null || (Number.isInteger(values[name]) && values[name] > 0),
          );
          if (validIds) setQuery((current) => ({ ...values, page: 1, per_page: current.per_page }));
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
      </aside>
      <div className="page history-page">
      <div className="history-toolbar">
        <Space wrap>
          <Button
            size="small"
            type={isFilterButtonActive ? 'primary' : 'default'}
            icon={<FilterOutlined />}
            onClick={() => setFiltersVisible((current) => !current)}
            title={filtersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
            aria-expanded={filtersVisible}
            aria-controls="history-filters"
            className={`access-filter-button ${isFilterButtonActive ? 'access-filter-button_active' : ''}`}
          >Фильтры</Button>
        <Pagination
          size="small"
          current={result?.current_page ?? query.page}
          pageSize={result?.per_page ?? query.per_page}
          total={result?.total ?? 0}
          showSizeChanger
          pageSizeOptions={[10, 25, 50, 100]}
          showTotal={(total) => `Всего: ${total}`}
          disabled={loading || Boolean(error)}
          onChange={(page, per_page) => setQuery((current) => ({
            ...current, page: per_page === current.per_page ? page : 1, per_page,
          }))}
        />
        </Space>
        <Button size="small" icon={<ReloadOutlined />} loading={loading}
          onClick={() => setQuery((current) => ({ ...current }))}>Обновить</Button>
      </div>
      {error && <Alert type="error" showIcon message="Ошибка загрузки истории" description={error} />}
      <Table
        bordered size="small" rowKey="id" columns={columns}
        dataSource={result?.data ?? []} loading={loading} pagination={false}
        scroll={{ x: 1070 }}
        locale={{ emptyText: error ? 'Журнал не загружен' : 'Изменений не найдено' }}
      />
      </div>
    </div>
  );
}
