-- 为 biz_resumes 表增加履历哈希、DeepSeek 解析技能标签、项目摘要及清洗后纯文本字段
ALTER TABLE `biz_resumes`
  ADD COLUMN `resume_hash` varchar(66) NULL COMMENT '66位Keccak-256初始履历哈希值' AFTER `ai_skill_tags`,
  ADD COLUMN `parsed_skills` json NULL COMMENT 'DeepSeek提取的专业技能标签数组' AFTER `resume_hash`,
  ADD COLUMN `project_summary` text NULL COMMENT 'DeepSeek提取的项目实习经历摘要' AFTER `parsed_skills`,
  ADD COLUMN `cleaned_text` mediumtext NULL COMMENT '清洗后的标准化简历纯文本' AFTER `project_summary`;

-- 为 biz_student_profiles 表同步增加履历原件路径、哈希、技能JSON与项目摘要字段
ALTER TABLE `biz_student_profiles`
  ADD COLUMN `resume_path` varchar(500) NULL COMMENT '默认简历原件存储路径' AFTER `self_intro`,
  ADD COLUMN `resume_hash` varchar(66) NULL COMMENT '66位Keccak-256初始履历哈希值' AFTER `resume_path`,
  ADD COLUMN `parsed_skills` json NULL COMMENT 'DeepSeek提取的专业技能标签数组' AFTER `resume_hash`,
  ADD COLUMN `project_summary` text NULL COMMENT 'DeepSeek提取的项目实习经历摘要' AFTER `parsed_skills`;

-- 创建 biz_students 视图以与论文表名保持一致
CREATE OR REPLACE VIEW `biz_students` AS
SELECT * FROM `biz_student_profiles`;
