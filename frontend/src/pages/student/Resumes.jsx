import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Button, Upload, List, Tag, Space, Typography, Popconfirm,
  message, Empty, Tooltip, Modal, Row, Col, Divider, Input, Spin,
  Form, Select, Collapse, Alert
} from 'antd';
import {
  DeleteOutlined, StarOutlined, StarFilled,
  FilePdfOutlined, FileWordOutlined, EyeOutlined,
  DownloadOutlined, InboxOutlined, SafetyCertificateOutlined,
  TagsOutlined, ProjectOutlined, EditOutlined, SaveOutlined,
  PlusOutlined, CopyOutlined, UserOutlined, CheckCircleOutlined, RobotOutlined
} from '@ant-design/icons';
import { studentApi } from '../../api/services';
import dayjs from 'dayjs';
import mammoth from 'mammoth';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 限制
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const TAG_COLORS = ['blue', 'geekblue', 'purple', 'cyan', 'indigo', 'magenta', 'volcano', 'green'];

const getFileIcon = (name) => {
  if (!name) return <FilePdfOutlined />;
  if (name.toLowerCase().endsWith('.pdf')) return <FilePdfOutlined style={{ color: '#ef4444' }} />;
  return <FileWordOutlined style={{ color: '#3b82f6' }} />;
};

const customStyles = `
  .resume-dragger-wrapper {
    margin-bottom: 24px;
  }
  .resume-dragger-wrapper .ant-upload.ant-upload-drag {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    transition: all 0.3s;
  }
  .resume-dragger-wrapper .ant-upload.ant-upload-drag:hover {
    border-color: #6366f1;
    background: #eef2ff;
  }
  .asset-card {
    background: #ffffff;
    border-radius: 16px;
    margin-bottom: 16px !important;
    padding: 8px 12px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid #f1f5f9;
    cursor: pointer;
  }
  .asset-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -8px rgba(0,0,0,0.08);
    border-color: #cbd5e1;
  }
  .asset-card-default {
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    border: 1px solid #bfdbfe;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.08);
  }
  .asset-card-selected {
    border: 2px solid #6366f1 !important;
  }
  .action-icon-btn {
    color: #94a3b8 !important;
    transition: all 0.3s;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .action-icon-btn:hover {
    color: #3b82f6 !important;
    background: #f1f5f9 !important;
  }
  .action-icon-delete:hover {
    color: #ef4444 !important;
    background: #fee2e2 !important;
  }
  .action-icon-default:hover {
    color: #f59e0b !important;
    background: #fef3c7 !important;
  }
  .skill-cloud-card {
    border-radius: 16px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.03);
    border: 1px solid #e2e8f0;
  }
  .hash-badge-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #334155;
    word-break: break-all;
  }
`;

export default function StudentResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  // 个人履历档案状态
  const [profileForm] = Form.useForm();
  const [savingProfile, setSavingProfile] = useState(false);

  // 解析预览与维护状态
  const [editingParsed, setEditingParsed] = useState(false);
  const [editSkills, setEditSkills] = useState([]);
  const [editSummary, setEditSummary] = useState('');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savingParsed, setSavingParsed] = useState(false);
  const [parsingExisting, setParsingExisting] = useState(false);
  const [pollingParsing, setPollingParsing] = useState(false);
  const pollTimerRef = useRef(null);

  // 文件预览 Modal 状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [parsing, setParsing] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await studentApi.getProfile();
      if (res.data) {
        profileForm.setFieldsValue({
          real_name: res.data.real_name || '',
          student_no: res.data.student_no || '',
          school_name: res.data.school_name || '',
          major: res.data.major || '',
          degree: res.data.degree || '本科',
          graduation_year: res.data.graduation_year ? String(res.data.graduation_year) : '',
          city: res.data.city || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
        });
      }
    } catch (e) {
      // 忽略首次未建档异常
    }
  };

  const fetchResumes = async (preferredId = null) => {
    setLoading(true);
    try {
      const res = await studentApi.getResumes();
      const list = res.data || [];
      setResumes(list);
      if (list.length > 0) {
        const target = preferredId
          ? list.find((r) => r.id === preferredId)
          : list.find((r) => r.id === selectedResumeId) || list.find((r) => r.is_default) || list[0];
        if (target) {
          setSelectedResumeId(target.id);
        }
      } else {
        setSelectedResumeId(null);
      }
      return list;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchResumes();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const activeResume = resumes.find((r) => r.id === selectedResumeId) || resumes.find((r) => r.is_default) || resumes[0] || null;

  useEffect(() => {
    if (activeResume) {
      setEditSkills(Array.isArray(activeResume.parsed_skills) ? activeResume.parsed_skills : []);
      setEditSummary(activeResume.project_summary || '');
      setEditingParsed(false);
    }
  }, [activeResume?.id, activeResume?.parsed_skills?.length, activeResume?.project_summary]);

  // 轮询异步 DeepSeek 解析结果
  const startPollingForParsedResult = (resumeId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setPollingParsing(true);
    let attempts = 0;
    pollTimerRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const list = await fetchResumes(resumeId);
        const target = (list || []).find((r) => r.id === resumeId);
        if ((target && ((target.parsed_skills && target.parsed_skills.length > 0) || target.project_summary)) || attempts >= 10) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          setPollingParsing(false);
        }
      } catch {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setPollingParsing(false);
      }
    }, 1500);
  };

  // 文件类型白名单校验（仅允许 PDF 与 .docx）与文件大小限制（<= 10MB）
  const beforeUpload = (file) => {
    const fileName = (file.name || '').toLowerCase();
    const isPdfOrDocxExt = fileName.endsWith('.pdf') || fileName.endsWith('.docx');
    const isAllowedMime = !file.type || ALLOWED_MIME_TYPES.includes(file.type);

    if (!isPdfOrDocxExt || !isAllowedMime) {
      message.error('文件类型校验失败：仅允许上传 PDF 与 .docx 格式的简历');
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_SIZE) {
      message.error('文件大小超出限制：单份简历不能超过 10MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleUpload = async ({ file }) => {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await studentApi.uploadResume(form);
      const uploadedId = res.data?.id;
      message.success('简历上传成功，已生成 Keccak-256 初始哈希并触发 DeepSeek 异步解析');
      await fetchResumes(uploadedId);
      if (uploadedId) {
        startPollingForParsedResult(uploadedId);
      }
    } catch (err) {
      console.error(err);
      if (!err.response) {
        message.error('上传失败：' + (err.message || '未知错误'));
      }
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSaveProfile = async (values) => {
    setSavingProfile(true);
    try {
      await studentApi.updateProfile({
        ...values,
        graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
      });
      message.success('个人履历档案已保存并同步');
    } catch (e) {
      message.error(e.response?.data?.message || '保存档案失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSkillTag = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (!editSkills.includes(trimmed)) {
      setEditSkills([...editSkills, trimmed]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkillTag = (tag) => {
    setEditSkills(editSkills.filter((t) => t !== tag));
  };

  const handleSaveParsedResume = async () => {
    if (!activeResume) return;
    setSavingParsed(true);
    try {
      await studentApi.updateParsedResume(activeResume.id, {
        parsed_skills: editSkills,
        project_summary: editSummary,
      });
      message.success('技能标签与项目摘要已核对保存');
      setEditingParsed(false);
      await fetchResumes(activeResume.id);
    } catch (e) {
      message.error(e.response?.data?.message || '保存失败');
    } finally {
      setSavingParsed(false);
    }
  };

  const handleParseExisting = async () => {
    if (!activeResume) return;
    setParsingExisting(true);
    try {
      await studentApi.parseResume(activeResume.id);
      message.success('已完成文本提取、Keccak-256 哈希计算与 DeepSeek 解析');
      await fetchResumes(activeResume.id);
    } catch (e) {
      message.error(e.response?.data?.message || '解析失败');
    } finally {
      setParsingExisting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await studentApi.deleteResume(id);
      message.success('已删除');
      fetchResumes();
    } catch (e) {
      message.error(e.response?.data?.message || '删除失败');
    }
  };

  const handleSetDefault = async (id) => {
    await studentApi.setDefault(id);
    message.success('默认简历已切换，并已同步至个人履历档案');
    fetchResumes(id);
  };

  const handleCopyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard?.writeText(hash);
    message.success('66位 Keccak-256 履历哈希已复制到剪贴板');
  };

  const handlePreview = async (resume) => {
    const url = `http://localhost:3001${resume.file_path}`;
    setPreviewUrl(url);
    setPreviewTitle(resume.file_name);
    setPreviewVisible(true);
    setPreviewHtml('');

    if (resume.file_name.toLowerCase().endsWith('.docx')) {
      setParsing(true);
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } catch (e) {
        console.error('Word 解析失败:', e);
        message.error('文字预览失败，建议下载查看');
      } finally {
        setParsing(false);
      }
    }
  };

  const handleDownload = async (resume) => {
    try {
      const url = `http://localhost:3001${resume.file_path}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = resume.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      message.error('下载失败，请尝试右键另存为');
      window.open(`http://localhost:3001${resume.file_path}`, '_blank');
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <style>{customStyles}</style>

      <Title level={3} style={{ color: '#0f172a', fontWeight: 800, marginBottom: 6 }}>
        个人简历与履历档案管理
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 13 }}>
        请先建立个人学业档案并上传简历附件（仅支持 PDF 与 .docx）。系统将自动提取纯文本、计算 66 位 Keccak-256 初始履历哈希，并异步调用 DeepSeek 大模型抽取专业技能标签云与项目实习摘要。
      </Text>

      {/* 学业履历档案建立与维护 */}
      <Collapse
        defaultActiveKey={['profile']}
        style={{ marginBottom: 24, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0' }}
        items={[
          {
            key: 'profile',
            label: (
              <Space>
                <UserOutlined style={{ color: '#6366f1' }} />
                <Text strong>个人学业成果与基础履历档案</Text>
              </Space>
            ),
            children: (
              <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
                <Row gutter={16}>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
                      <Input placeholder="如：张伟" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="student_no" label="学号">
                      <Input placeholder="如：B23060201" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="school_name" label="毕业院校">
                      <Input placeholder="如：江西软件职业技术大学" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="major" label="所学专业">
                      <Input placeholder="如：软件工程 / 区块链工程" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="degree" label="学历层次">
                      <Select
                        options={[
                          { value: '专科', label: '专科' },
                          { value: '本科', label: '本科' },
                          { value: '硕士', label: '硕士' },
                          { value: '博士', label: '博士' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="graduation_year" label="毕业年份">
                      <Input placeholder="如：2027" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6}>
                    <Form.Item name="city" label="期望工作城市">
                      <Input placeholder="如：杭州 / 上海 / 南昌" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8} md={6} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
                    <Button type="primary" htmlType="submit" loading={savingProfile} icon={<SaveOutlined />} block style={{ background: '#6366f1' }}>
                      保存履历档案
                    </Button>
                  </Col>
                </Row>
              </Form>
            ),
          },
        ]}
      />

      {/* 拖拽上传区 */}
      <div className="resume-dragger-wrapper">
        <Dragger
          customRequest={handleUpload}
          beforeUpload={beforeUpload}
          showUploadList={false}
          accept=".pdf,.docx"
          disabled={uploading}
        >
          <div style={{ padding: '18px 0' }}>
            <p className="ant-upload-drag-icon">
              {uploading ? <Spin size="large" /> : <InboxOutlined style={{ color: '#6366f1' }} />}
            </p>
            <p className="ant-upload-text" style={{ fontSize: 17, color: '#1e293b', fontWeight: 600 }}>
              点击或将简历文件拖拽至此区域上传
            </p>
            <p className="ant-upload-hint" style={{ color: '#64748b' }}>
              白名单校验：仅支持 PDF 与 .docx 格式，单文件大小不超过 10MB。上传后自动生成 Keccak-256 哈希并调用 DeepSeek 解析。
            </p>
          </div>
        </Dragger>
      </div>

      <Row gutter={24}>
        {/* 左侧：简历附件列表 */}
        <Col xs={24} lg={11}>
          <Card
            title={<Text strong>已上传简历附件 ({resumes.length})</Text>}
            className="skill-cloud-card"
            bodyStyle={{ padding: '12px 16px' }}
          >
            {resumes.length === 0 && !loading ? (
              <Empty
                description={<span>暂无简历附件，<Text style={{ color: '#6366f1' }}>请在上方拖拽上传 PDF 或 .docx 简历</Text></span>}
                style={{ padding: '40px 0' }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                loading={loading}
                dataSource={resumes}
                renderItem={(r) => (
                  <List.Item
                    onClick={() => setSelectedResumeId(r.id)}
                    className={`asset-card ${r.is_default ? 'asset-card-default' : ''} ${activeResume?.id === r.id ? 'asset-card-selected' : ''}`}
                    actions={[
                      <Tooltip key="default" title={r.is_default ? '当前默认简历' : '设为默认简历'}>
                        <Button
                          className={`action-icon-btn ${r.is_default ? '' : 'action-icon-default'}`}
                          shape="circle"
                          icon={r.is_default ? <StarFilled style={{ color: '#f59e0b', fontSize: 16 }} /> : <StarOutlined />}
                          onClick={(e) => { e.stopPropagation(); if (!r.is_default) handleSetDefault(r.id); }}
                        />
                      </Tooltip>,
                      <Tooltip key="preview" title="原文预览">
                        <Button
                          className="action-icon-btn"
                          shape="circle"
                          icon={<EyeOutlined />}
                          onClick={(e) => { e.stopPropagation(); handlePreview(r); }}
                        />
                      </Tooltip>,
                      <Tooltip key="download" title="下载原件">
                        <Button
                          className="action-icon-btn"
                          shape="circle"
                          icon={<DownloadOutlined />}
                          onClick={(e) => { e.stopPropagation(); handleDownload(r); }}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title="确定要删除这份简历吗？"
                        description="删除操作不可逆转。"
                        onConfirm={(e) => { e?.stopPropagation(); handleDelete(r.id); }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="确定删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true, size: 'small' }}
                      >
                        <Tooltip title="删除简历">
                          <Button
                            className="action-icon-btn action-icon-delete"
                            shape="circle"
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: 30, padding: '2px' }}>{getFileIcon(r.file_name)}</div>}
                      title={
                        <Space wrap>
                          <Text strong style={{ fontSize: 14, color: '#0f172a' }}>{r.file_name}</Text>
                          {r.is_default ? (
                            <Tag color="gold" style={{ margin: 0, fontWeight: 600 }}>默认履历</Tag>
                          ) : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {r.file_size ? `${(r.file_size / 1024).toFixed(0)} KB · ` : ''}
                            {dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}
                          </Text>
                          {r.resume_hash && (
                            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                              哈希: {r.resume_hash.slice(0, 14)}...{r.resume_hash.slice(-8)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：可视化个人技能标签云与履历解析预览卡片 */}
        <Col xs={24} lg={13}>
          <Card
            className="skill-cloud-card"
            title={
              <Space>
                <TagsOutlined style={{ color: '#6366f1' }} />
                <Text strong>个人技能标签云与履历解析预览</Text>
                {pollingParsing && <Spin size="small" />}
              </Space>
            }
            extra={
              activeResume && (
                editingParsed ? (
                  <Space>
                    <Button size="small" onClick={() => setEditingParsed(false)}>取消</Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={savingParsed}
                      onClick={handleSaveParsedResume}
                      style={{ background: '#6366f1' }}
                    >
                      保存核对结果
                    </Button>
                  </Space>
                ) : (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<RobotOutlined />}
                      loading={parsingExisting}
                      onClick={handleParseExisting}
                    >
                      {activeResume.resume_hash ? '重新解析' : 'DeepSeek 立即解析'}
                    </Button>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setEditingParsed(true)}
                    >
                      核对与维护
                    </Button>
                  </Space>
                )
              )
            }
          >
            {!activeResume ? (
              <Empty description="上传或选择左侧简历后，将在此展示技能标签云与 DeepSeek 解析摘要" />
            ) : (
              <div>
                {pollingParsing && (
                  <Alert
                    type="info"
                    showIcon
                    message="DeepSeek 大模型正在异步抽取专业技能标签与项目实习摘要，请稍候..."
                    style={{ marginBottom: 16, borderRadius: 10 }}
                  />
                )}

                {/* 初始履历哈希 */}
                <div style={{ marginBottom: 20 }}>
                  <Space style={{ marginBottom: 6 }}>
                    <SafetyCertificateOutlined style={{ color: '#10b981' }} />
                    <Text strong style={{ fontSize: 13 }}>66位 Keccak-256 初始履历哈希 (resume_hash)</Text>
                    {activeResume.resume_hash && (
                      <Tag icon={<CheckCircleOutlined />} color="success">已固化生成</Tag>
                    )}
                  </Space>
                  <div className="hash-badge-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span>{activeResume.resume_hash || '暂无哈希（旧版上传记录，重新上传后自动生成）'}</span>
                    {activeResume.resume_hash && (
                      <Tooltip title="复制完整66位哈希">
                        <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleCopyHash(activeResume.resume_hash)} />
                      </Tooltip>
                    )}
                  </div>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* 可视化个人技能标签云 */}
                <div style={{ marginBottom: 20 }}>
                  <Space style={{ marginBottom: 10 }}>
                    <TagsOutlined style={{ color: '#6366f1' }} />
                    <Text strong style={{ fontSize: 13 }}>个人技能标签云 (parsed_skills)</Text>
                  </Space>
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 12, minHeight: 58 }}>
                    {(editingParsed ? editSkills : (activeResume.parsed_skills || [])).length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {pollingParsing ? '正在提取技能标签...' : '暂未提取到技能标签，可点击右上角“核对与维护”手动补充'}
                      </Text>
                    ) : (
                      <Space size={[8, 8]} wrap>
                        {(editingParsed ? editSkills : activeResume.parsed_skills).map((skill, idx) => (
                          <Tag
                            key={`${skill}-${idx}`}
                            color={TAG_COLORS[idx % TAG_COLORS.length]}
                            closable={editingParsed}
                            onClose={() => handleRemoveSkillTag(skill)}
                            style={{ fontSize: 13, padding: '4px 10px', borderRadius: 16 }}
                          >
                            {skill}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </div>
                  {editingParsed && (
                    <Space.Compact style={{ width: '100%', marginTop: 10 }}>
                      <Input
                        placeholder="输入补充的专业技能标签，如 Solidity / React"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onPressEnter={handleAddSkillTag}
                      />
                      <Button icon={<PlusOutlined />} onClick={handleAddSkillTag}>添加标签</Button>
                    </Space.Compact>
                  )}
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* 项目与实习经历摘要 */}
                <div>
                  <Space style={{ marginBottom: 10 }}>
                    <ProjectOutlined style={{ color: '#3b82f6' }} />
                    <Text strong style={{ fontSize: 13 }}>项目与实习经历摘要 (project_summary)</Text>
                  </Space>
                  {editingParsed ? (
                    <TextArea
                      rows={5}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      placeholder="请核对或补充您的项目与实习经历摘要..."
                    />
                  ) : (
                    <div style={{ padding: '14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <Paragraph style={{ marginBottom: 0, color: '#334155', lineHeight: 1.7 }}>
                        {activeResume.project_summary || (pollingParsing ? 'DeepSeek 正在提炼项目与实习经历摘要...' : '暂无项目摘要，可点击右上角“核对与维护”补充。')}
                      </Paragraph>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 原件在线预览 Modal */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={() => {
              const currentResume = resumes.find((r) => r.file_name === previewTitle);
              if (currentResume) handleDownload(currentResume);
            }}
          >
            保存附件
          </Button>,
          <Button key="close" type="primary" onClick={() => setPreviewVisible(false)} style={{ background: '#6366f1' }}>
            关闭预览
          </Button>,
        ]}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 200px)', padding: 0, overflow: 'hidden' }}
      >
        {parsing ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="large" tip="系统正在解析内容流..." />
          </div>
        ) : (
          <>
            {previewUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="简历视图终端"
              />
            ) : previewHtml ? (
              <div
                style={{ height: '100%', overflowY: 'auto', padding: '40px 60px', background: '#fff' }}
                className="docx-preview-content"
              >
                <style>{`
                  .docx-preview-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                  .docx-preview-content td, .docx-preview-content th { border: 1px solid #ddd; padding: 8px; }
                  .docx-preview-content p { margin-bottom: 1em; line-height: 1.6; }
                  .docx-preview-content img { max-width: 100%; height: auto; }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <FileWordOutlined style={{ fontSize: 64, color: '#3b82f6', marginBottom: 20 }} />
                <Text strong style={{ fontSize: 18 }}>当前格式暂不支持通过在线引擎预览</Text>
                <Text type="secondary" style={{ marginTop: 10 }}>建议：请直接下载并在本地应用程序查阅文档副本。</Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  style={{ marginTop: 24, background: '#10b981', border: 'none' }}
                  onClick={() => {
                    const currentResume = resumes.find((r) => r.file_name === previewTitle);
                    if (currentResume) handleDownload(currentResume);
                  }}
                >
                  本地下载
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
