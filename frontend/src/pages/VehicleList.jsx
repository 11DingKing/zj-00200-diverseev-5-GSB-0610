import React, { useEffect, useState, useCallback } from 'react';
import { 
  Table, Button, Tag, Select, Input, Modal, Form, InputNumber, 
  message, Popconfirm, Space, Row, Col, Card, Badge, Tooltip
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { vehicleAPI, metaAPI, comparisonAPI } from '../api.js';

const { Option } = Select;
const { Search } = Input;

function VehicleList() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [meta, setMeta] = useState({ categories: [], scenarios: [], statuses: [] });
  const [filters, setFilters] = useState({
    category: null,
    scenario: null,
    status: '在售',
    keyword: ''
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form] = Form.useForm();
  const [compareIds, setCompareIds] = useState(new Set());
  const [compareCount, setCompareCount] = useState(0);
  const [compareMax, setCompareMax] = useState(4);

  const loadComparison = useCallback(async () => {
    try {
      const res = await comparisonAPI.getComparison();
      const ids = new Set(res.data.vehicles.map(v => v.id));
      setCompareIds(ids);
      setCompareCount(res.data.count);
      setCompareMax(res.data.maxCount);
    } catch (error) {
      console.error('加载对比集失败:', error);
    }
  }, []);

  useEffect(() => {
    loadMeta();
    loadVehicles();
    loadComparison();
  }, [filters]);

  const loadMeta = async () => {
    try {
      const res = await metaAPI.getMeta();
      setMeta(res.data);
    } catch (error) {
      console.error('加载元数据失败:', error);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.scenario) params.scenario = filters.scenario;
      if (filters.status) params.status = filters.status;
      
      const res = await vehicleAPI.getVehicles(params);
      let data = res.data;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        data = data.filter(v => 
          v.name.toLowerCase().includes(kw) || 
          v.brand.toLowerCase().includes(kw)
        );
      }
      setVehicles(data);
    } catch (error) {
      message.error('加载车型数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingVehicle(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    form.setFieldsValue({
      ...vehicle,
      scenarios: vehicle.scenarios
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await vehicleAPI.deleteVehicle(id);
      message.success('删除成功');
      loadVehicles();
      loadComparison();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingVehicle) {
        await vehicleAPI.updateVehicle(editingVehicle.id, values);
        message.success('更新成功');
      } else {
        await vehicleAPI.createVehicle(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadVehicles();
    } catch (error) {
      message.error(editingVehicle ? '更新失败' : '创建失败');
      console.error(error);
    }
  };

  const handleAddToCompare = async (vehicle) => {
    try {
      await comparisonAPI.addToComparison(vehicle.id);
      message.success(`已将 ${vehicle.brand} ${vehicle.name} 加入对比`);
      loadComparison();
    } catch (error) {
      const msg = error.response?.data?.error || '加入对比失败';
      message.error(msg);
    }
  };

  const handleRemoveFromCompare = async (id) => {
    try {
      await comparisonAPI.removeFromComparison(id);
      message.success('已从对比集移除');
      loadComparison();
    } catch (error) {
      message.error('移除失败');
    }
  };

  const getStatusTag = (status) => {
    const colorMap = {
      '在售': 'green',
      '停售': 'red',
      '待上市': 'orange'
    };
    return <Tag color={colorMap[status]}>{status}</Tag>;
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      '微型代步': '#52c41a',
      '家用紧凑': '#1890ff',
      '中大型': '#722ed1',
      '商用': '#fa8c16'
    };
    return colorMap[category] || '#666';
  };

  const columns = [
    {
      title: '品牌车型',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.brand} {text}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.name}</div>
        </div>
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
        <div style={{ padding: 8 }}>
          <Search
            placeholder="搜索车型"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={confirm}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button type="primary" onClick={confirm} size="small">搜索</Button>
            <Button onClick={() => setSelectedKeys([])} size="small">重置</Button>
          </Space>
        </div>
      ),
      filterIcon: <SearchOutlined />,
      onFilter: (value, record) => 
        record.name.toLowerCase().includes(value.toLowerCase()) ||
        record.brand.toLowerCase().includes(value.toLowerCase())
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (text) => (
        <Tag color={getCategoryColor(text)}>{text}</Tag>
      ),
      filters: meta.categories.map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value
    },
    {
      title: '整备质量',
      dataIndex: 'curb_weight',
      key: 'curb_weight',
      width: 110,
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 600 }}>{text}</span> kg
          {text < 1500 && <span className="lightweight-badge">轻量化</span>}
        </div>
      ),
      sorter: (a, b) => a.curb_weight - b.curb_weight,
      defaultSortOrder: 'ascend'
    },
    {
      title: '续航',
      dataIndex: 'range',
      key: 'range',
      width: 100,
      render: (text) => `${text} km`,
      sorter: (a, b) => a.range - b.range
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 110,
      render: (text) => `${text.toFixed(1)} 万元`,
      sorter: (a, b) => a.price - b.price
    },
    {
      title: '适配场景',
      dataIndex: 'scenarios',
      key: 'scenarios',
      width: 180,
      render: (scenarios) => (
        <div>
          {scenarios.map(s => (
            <Tag key={s} className="vehicle-tag">{s}</Tag>
          ))}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: getStatusTag,
      filters: meta.statuses.map(s => ({ text: s, value: s })),
      onFilter: (value, record) => record.status === value
    },
    {
      title: '能量密度',
      dataIndex: 'energy_density',
      key: 'energy_density',
      width: 100,
      render: (text) => text ? `${text} Wh/kg` : '-',
      sorter: (a, b) => (a.energy_density || 0) - (b.energy_density || 0)
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const inCompare = compareIds.has(record.id);
        return (
          <Space size="small" wrap>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            {inCompare ? (
              <Tooltip title="从对比集移除">
                <Button type="link" size="small" style={{ color: '#faad14' }} onClick={() => handleRemoveFromCompare(record.id)}>
                  已加入对比
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title={compareCount >= compareMax ? `对比集最多${compareMax}款` : '加入对比集'}>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<SwapOutlined />}
                  disabled={compareCount >= compareMax}
                  onClick={() => handleAddToCompare(record)}
                >
                  加入对比
                </Button>
              </Tooltip>
            )}
            <Popconfirm
              title="确定删除该车型？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <Card className="filter-section">
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增车型
            </Button>
          </Col>
          <Col>
            <Link to="/compare">
              <Badge count={compareCount} overflowCount={compareMax} offset={[0, 0]}>
                <Button icon={<SwapOutlined />}>
                  车型对比
                </Button>
              </Badge>
            </Link>
          </Col>
          <Col>
            <Select
              placeholder="选择类别"
              style={{ width: 150 }}
              allowClear
              value={filters.category}
              onChange={v => setFilters({ ...filters, category: v })}
            >
              {meta.categories.map(c => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="选择场景"
              style={{ width: 150 }}
              allowClear
              value={filters.scenario}
              onChange={v => setFilters({ ...filters, scenario: v })}
            >
              {meta.scenarios.map(s => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="选择状态"
              style={{ width: 150 }}
              value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}
            >
              {meta.statuses.map(s => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto">
            <Input.Search
              placeholder="搜索品牌或车型名称"
              allowClear
              enterButton
              style={{ maxWidth: 300 }}
              onSearch={value => setFilters({ ...filters, keyword: value })}
            />
          </Col>
        </Row>
      </Card>

      <Card className="chart-container">
        <Table
          columns={columns}
          dataSource={vehicles}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条数据`,
            pageSize: 15
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title={editingVehicle ? '编辑车型' : '新增车型'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: '在售', scenarios: [] }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请输入品牌' }]}
              >
                <Input placeholder="请输入品牌" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="车型名称"
                rules={[{ required: true, message: '请输入车型名称' }]}
              >
                <Input placeholder="请输入车型名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="车型类别"
                rules={[{ required: true, message: '请选择类别' }]}
              >
                <Select placeholder="请选择类别">
                  {meta.categories.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {meta.statuses.map(s => (
                    <Option key={s} value={s}>{s}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="curb_weight"
                label="整备质量 (kg)"
                rules={[{ required: true, message: '请输入整备质量' }]}
              >
                <InputNumber min={500} max={20000} style={{ width: '100%' }} placeholder="kg" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="range"
                label="续航 (km)"
                rules={[{ required: true, message: '请输入续航' }]}
              >
                <InputNumber min={50} max={1500} style={{ width: '100%' }} placeholder="km" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="price"
                label="价格 (万元)"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber min={1} max={500} step={0.1} style={{ width: '100%' }} placeholder="万元" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="scenarios"
            label="适配场景"
            rules={[{ required: true, message: '请选择至少一个场景' }]}
          >
            <Select mode="multiple" placeholder="请选择适配场景">
              {meta.scenarios.map(s => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="material" label="车身材料">
                <Input placeholder="如：高强度钢、铝合金等" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="energy_density" label="能量密度 (Wh/kg)">
                <InputNumber min={50} max={500} style={{ width: '100%' }} placeholder="Wh/kg" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingVehicle ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default VehicleList;
