const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');
const { keccak256, toUtf8Bytes } = require('ethers');

/**
 * 清洗简历文本中的多余换行符与控制字符
 * @param {string} rawText
 * @returns {string}
 */
function cleanResumeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 去除不可见控制字符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 使用 ethers.js keccak256 算法对标准化简历纯文本计算生成 66 位十六进制初始履历哈希值
 * @param {string} cleanedText
 * @returns {string} 0x 开头的 66 位十六进制哈希
 */
function computeResumeHash(cleanedText) {
  return keccak256(toUtf8Bytes(cleanedText || ''));
}

/**
 * 从临时缓冲区（Buffer）按文件扩展名自动分发提取文本
 * 支持 .pdf（pdf-parse 逐页读取底层文本流）与 .docx（mammoth 提取段落纯文本）
 * @param {Buffer} buffer
 * @param {string} ext 文件扩展名（如 '.pdf'、'.docx'）
 * @returns {Promise<string>}
 */
async function extractTextFromBuffer(buffer, ext) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('无效的文件缓冲区');
  }
  const normalizedExt = (ext || '').toLowerCase();

  if (normalizedExt === '.pdf') {
    const data = await pdf(buffer);
    return data.text || '';
  }

  if (normalizedExt === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  throw new Error('仅支持 PDF 与 .docx 格式的简历文件');
}

/**
 * 通用文件文本提取工具（基于磁盘路径）
 * 支持 .pdf 和 .docx
 */
async function extractText(filePath) {
  // 🚀 修复路径解析逻辑：针对以 / 开头的路径，path.join 会正确合并到 process.cwd()
  // 而 path.isAbsolute 在 Windows 下会误判 / 开头的路径为绝对路径
  const fullPath = path.isAbsolute(filePath) && !filePath.startsWith('/')
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('文件不存在: ' + fullPath);
  }

  const ext = path.extname(fullPath).toLowerCase();
  const buffer = fs.readFileSync(fullPath);
  return extractTextFromBuffer(buffer, ext);
}

module.exports = {
  extractText,
  extractTextFromBuffer,
  cleanResumeText,
  computeResumeHash,
};
