import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Pagination, Select, Table, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { createAccess, fetchAccessGroups, fetchAccessInfo, updateAccess } from '../api/access';
import { TableSkeleton } from '../components/TableSkeleton';
import { parsePositiveInteger } from '../routing';
import { normalizeAccessGroups, normalizeAccesses } from '../utils/normalizers';

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZES = [10, 20, 50, 100];
const SORT_FIELDS = ['id', 'accessname', 'name', 'label', 'accessgroup', 'position'];
const TABLE_MIN_WIDTH = 1080;

const getDefaultAccess = (groups) => ({
  name: '',
  label: '',
  accessgroup: groups[0]?.id,
  accessname: '',
  position: 0,
});

const compareText = (a, b) => String(a || '').localeCompare(String(b || ''), 'ru');

export function SettingsPage({ searchParams, updateSearch }) {
  const [form] = Form.useForm();
  const [infoData, setInfoData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const search = searchParams.get('q') ?? '';
  const groupFilter = useMemo(
    () => searchParams.getAll('group').map(parsePositiveInteger).filter((value) => value !== undefined),
    [searchParams],
  );
  const requestedSort = searchParams.get('sort');
  const sortField = SORT_FIELDS.includes(requestedSort) ? requestedSort : 'id';
  const sortDirection = searchParams.get('order') === 'descend' ? 'descend' : 'ascend';
  const requestedPage = parsePositiveInteger(searchParams.get('page')) ?? 1;
  const requestedSize = parsePositiveInteger(searchParams.get('per_page'));
  const pageSize = PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;

  const loadAccesses = async () => {
    setLoading(true);
    try {
      const [accessInfo, groupsData] = await Promise.all([fetchAccessInfo(), fetchAccessGroups()]);
      setInfoData(accessInfo);
      setGroups(normalizeAccessGroups(groupsData));
    } catch (err) {
      message.error(err.message || 'Не удалось загрузить доступы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccesses();
  }, []);

  const groupById = useMemo(() => new Map(groups.map((group) => [Number(group.id), group])), [groups]);
  const accesses = useMemo(() => normalizeAccesses(infoData), [infoData]);

  const preparedAccesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = accesses.filter((access) => {
      const groupLabel = groupById.get(Number(access.accessgroup))?.label || '';
      const matchesSearch =
        !query ||
        [
          access.id,
          access.accessname,
          access.name,
          access.label,
          access.accessgroup,
          groupLabel,
          access.position,
        ]
          .some((value) => String(value ?? '').toLowerCase().includes(query));
      const matchesGroup =
        !groupFilter.length || groupFilter.includes(Number(access.accessgroup));

      return matchesSearch && matchesGroup;
    });

    const sorted = [...filtered];
    const direction = sortDirection === 'ascend' ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortField === 'id' || sortField === 'position' || sortField === 'accessgroup') {
        return (Number(a[sortField] ?? 0) - Number(b[sortField] ?? 0)) * direction;
      }

      return compareText(a[sortField], b[sortField]) * direction;
    });

    return sorted;
  }, [accesses, groupById, groupFilter, search, sortDirection, sortField]);

  const currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(preparedAccesses.length / pageSize)));
  const pagedAccesses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return preparedAccesses.slice(start, start + pageSize);
  }, [currentPage, pageSize, preparedAccesses]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(getDefaultAccess(groups));
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      accessgroup: Number(record.accessgroup),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      accessgroup: Number(values.accessgroup),
    };

    setSaving(true);

    try {
      if (editing) {
        await updateAccess(editing.id, payload);
        message.success('Доступ обновлен');
      } else {
        await createAccess(payload);
        message.success('Доступ создан');
      }

      setModalOpen(false);
      await loadAccesses();
    } catch (err) {
      message.error(err.message || 'Не удалось сохранить доступ');
    } finally {
      setSaving(false);
    }
  };

  const handleTableChange = (_, filters, sorter) => {
    const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;

    updateSearch({
      group: filters.accessgroup,
      sort: activeSorter?.field === 'id' ? undefined : activeSorter?.field,
      order: activeSorter?.order === 'descend' ? 'descend' : undefined,
      page: undefined,
    });
  };

  const handleSearchChange = (event) => {
    updateSearch({ q: event.target.value, page: undefined }, { replace: true });
  };

  const sortOrder = (field) => (sortField === field ? sortDirection : null);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 86,
      sorter: true,
      sortOrder: sortOrder('id'),
    },
    {
      title: 'Краткое название',
      dataIndex: 'accessname',
      width: 220,
      sorter: true,
      sortOrder: sortOrder('accessname'),
      render: (value, record) => value || record.name,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      width: 220,
      sorter: true,
      sortOrder: sortOrder('name'),
    },
    {
      title: 'Описание',
      dataIndex: 'label',
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrder('label'),
    },
    {
      title: 'Группа',
      dataIndex: 'accessgroup',
      width: 180,
      sorter: true,
      sortOrder: sortOrder('accessgroup'),
      render: (value) => <Tag>{groupById.get(Number(value))?.label || value || 'Без группы'}</Tag>,
      filters: groups.map((group) => ({ text: group.label, value: group.id })),
      filteredValue: groupFilter.length ? groupFilter : null,
    },
    {
      title: 'Позиция',
      dataIndex: 'position',
      width: 120,
      sorter: true,
      sortOrder: sortOrder('position'),
    },
    {
      title: '',
      key: 'actions',
      fixed: 'right',
      width: 72,
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} title="Редактировать" />
      ),
    },
  ].map((column) => ({ ellipsis: true, ...column }));

  return (
    <section className="access-workspace">
      <div className="settings-toolbar ui-pagebar ui-pagebar--filters">
        <div className="settings-toolbar__actions">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Поиск"
            value={search}
            onChange={handleSearchChange}
            size="small"
            className="settings-search"
          />
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </div>
      </div>

      <div className="table-with-pagination">
        <div className="page-table">
          {loading ? (
            <TableSkeleton columns={columns} minWidth={TABLE_MIN_WIDTH} />
          ) : (
            <Table
              bordered
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={pagedAccesses}
              onChange={handleTableChange}
              scroll={{ x: TABLE_MIN_WIDTH, y: '100%' }}
              pagination={false}
            />
          )}
        </div>
        <nav className="ui-pagination" aria-label="Страницы настроек">
          <Pagination
            align="end"
            current={currentPage}
            pageSize={pageSize}
            total={preparedAccesses.length}
            showQuickJumper
            showSizeChanger
            pageSizeOptions={PAGE_SIZES}
            showTotal={(total) => `Всего: ${total}`}
            disabled={loading}
            onChange={(nextPage, nextSize) => updateSearch({
              page: nextPage > 1 ? nextPage : undefined,
              per_page: nextSize === DEFAULT_PAGE_SIZE ? undefined : nextSize,
            })}
          />
        </nav>
      </div>

      <Modal
        className="access-dialog"
        centered
        title={editing ? 'Редактирование доступа' : 'Новый доступ'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="access-form">
          <Form.Item
            name="accessname"
            label="Краткое название"
            rules={[{ required: true, message: 'Укажите краткое название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Системное название"
            rules={[{ required: true, message: 'Укажите системное название' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="label" label="Описание">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="accessgroup" label="Группа" rules={[{ required: true, message: 'Выберите группу' }]}>
            <Select options={groups.map((group) => ({ value: group.id, label: group.label }))} />
          </Form.Item>
          <Form.Item name="position" label="Позиция">
            <InputNumber min={0} className="form-number" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
