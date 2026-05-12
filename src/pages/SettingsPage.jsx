import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Pagination, Select, Space, Table, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { createAccess, fetchAccessGroups, fetchAccessInfo, updateAccess } from '../api/access';
import { normalizeAccessGroups, normalizeAccesses } from '../utils/normalizers';

const getDefaultAccess = (groups) => ({
  name: '',
  label: '',
  accessgroup: groups[0]?.id,
  accessname: '',
  position: 0,
});

const compareText = (a, b) => String(a || '').localeCompare(String(b || ''), 'ru');

export function SettingsPage() {
  const [form] = Form.useForm();
  const [infoData, setInfoData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tableFilters, setTableFilters] = useState({});
  const [sorterState, setSorterState] = useState({ field: 'id', order: 'ascend' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

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
    const groupFilter = tableFilters.accessgroup || [];

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
        !groupFilter.length || groupFilter.some((value) => Number(value) === Number(access.accessgroup));

      return matchesSearch && matchesGroup;
    });

    const sorted = [...filtered];
    const { field, order } = sorterState;

    if (field && order) {
      const direction = order === 'ascend' ? 1 : -1;

      sorted.sort((a, b) => {
        if (field === 'id' || field === 'position' || field === 'accessgroup') {
          return (Number(a[field] ?? 0) - Number(b[field] ?? 0)) * direction;
        }

        if (field === 'groupLabel') {
          return compareText(groupById.get(Number(a.accessgroup))?.label, groupById.get(Number(b.accessgroup))?.label) * direction;
        }

        return compareText(a[field], b[field]) * direction;
      });
    }

    return sorted;
  }, [accesses, groupById, search, sorterState, tableFilters]);

  const pagedAccesses = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return preparedAccesses.slice(start, start + pagination.pageSize);
  }, [pagination, preparedAccesses]);

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

    setTableFilters(filters);
    setSorterState({
      field: activeSorter?.field || 'id',
      order: activeSorter?.order || 'ascend',
    });
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPagination((current) => ({ ...current, current: 1 }));
  };

  const sortOrder = (field) => (sorterState.field === field ? sorterState.order : null);

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
      filteredValue: tableFilters.accessgroup || null,
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
        <Button icon={<EditOutlined />} onClick={() => openEdit(record)} title="Редактировать" />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={18} className="page settings-page">
      <div className="settings-toolbar">
        <Pagination
          size="small"
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={preparedAccesses.length}
          showSizeChanger
          onChange={(current, pageSize) => setPagination({ current, pageSize })}
        />
        <Space className="settings-toolbar__actions">
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
        </Space>
      </div>

      <Table
        bordered
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={pagedAccesses}
        onChange={handleTableChange}
        scroll={{ x: 1080, y: 'calc(100vh - 168px)' }}
        pagination={false}
      />

      <Modal
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
    </Space>
  );
}
