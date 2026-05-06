import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Pagination, Select, Space, Table, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { createAccess, fetchAccessInfo, updateAccess } from '../api/access';
import { ACCESS_GROUPS } from '../constants';
import { normalizeAccesses } from '../utils/normalizers';

const emptyAccess = {
  name: '',
  label: '',
  accessgroup: undefined,
  accessname: '',
  position: 0,
  group: ACCESS_GROUPS[0].key,
};

export function SettingsPage() {
  const [form] = Form.useForm();
  const [infoData, setInfoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50 });

  const loadAccesses = async () => {
    setLoading(true);
    try {
      setInfoData(await fetchAccessInfo());
    } catch (err) {
      message.error(err.message || 'Не удалось загрузить доступы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccesses();
  }, []);

  const accesses = useMemo(() => normalizeAccesses(infoData), [infoData]);
  const pagedAccesses = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return accesses.slice(start, start + pagination.pageSize);
  }, [accesses, pagination]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyAccess);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);

    try {
      if (editing) {
        await updateAccess(editing.id, values);
        message.success('Доступ обновлен');
      } else {
        await createAccess(values);
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
      dataIndex: 'group',
      width: 180,
      render: (value, record) => {
        const group = ACCESS_GROUPS.find((item) => item.key === value);
        return <Tag>{group?.label || value || record.accessgroup || 'Без группы'}</Tag>;
      },
      filters: ACCESS_GROUPS.map((item) => ({ text: item.label, value: item.key })),
      onFilter: (value, record) => record.group === value,
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
          <Form.Item name="group" label="Группа">
            <Select options={ACCESS_GROUPS.map((item) => ({ value: item.key, label: item.label }))} />
          </Form.Item>
          <Form.Item name="accessgroup" label="ID группы">
            <InputNumber min={0} className="form-number" />
          </Form.Item>
          <Form.Item name="position" label="Позиция">
            <InputNumber min={0} className="form-number" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
