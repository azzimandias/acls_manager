import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Pagination, Select, Space, Table, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { createAccess, fetchAccessGroups, fetchAccessInfo, updateAccess } from '../api/access';
import { normalizeAccessGroups, normalizeAccesses } from '../utils/normalizers';

const getDefaultAccess = (groups) => ({
  name: '',
  label: '',
  accessgroup: groups[0]?.id,
  accessname: '',
  position: 0,
});

export function SettingsPage() {
  const [form] = Form.useForm();
  const [infoData, setInfoData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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
  const pagedAccesses = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return accesses.slice(start, start + pagination.pageSize);
  }, [accesses, pagination]);

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

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 86, sorter: (a, b) => a.id - b.id },
    {
      title: 'Краткое название',
      dataIndex: 'accessname',
      width: 220,
      render: (value, record) => value || record.name,
    },
    { title: 'Название', dataIndex: 'name', width: 220 },
    {
      title: 'Описание',
      dataIndex: 'label',
      ellipsis: true,
    },
    {
      title: 'Группа',
      dataIndex: 'accessgroup',
      width: 180,
      render: (value) => <Tag>{groupById.get(Number(value))?.label || value || 'Без группы'}</Tag>,
      filters: groups.map((group) => ({ text: group.label, value: group.id })),
      onFilter: (value, record) => Number(record.accessgroup) === Number(value),
    },
    {
      title: 'Позиция',
      dataIndex: 'position',
      width: 120,
      sorter: (a, b) => a.position - b.position,
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
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={accesses.length}
          showSizeChanger
          onChange={(current, pageSize) => setPagination({ current, pageSize })}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить
        </Button>
      </div>

      <Table
        bordered
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={pagedAccesses}
        scroll={{ x: 1080, y: 'calc(100vh - 190px)' }}
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
