const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/studentController');
const authenticate = require('../middlewares/auth');
const { requireRole } = require('../middlewares/rbac');

// multer 配置：先写入内存临时缓冲区，待扩展名分发解析与清洗后再持久化落盘
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.docx'];
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream', // 部分客户端上传 docx 可能携带通用流 MIME
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext) || !allowedMimes.includes(file.mimetype)) {
      return cb(new Error('仅允许上传 PDF 与 .docx 格式的简历文件'));
    }
    cb(null, true);
  },
});

// 统一鉴权
router.use(authenticate);

// 档案 - 仅限学生
router.get('/profile',   requireRole('student'), ctrl.getProfile);
router.put('/profile',   requireRole('student'), ctrl.updateProfile);

// 简历 - 仅限学生
router.get('/resumes',                  requireRole('student'), ctrl.getResumes);
router.post('/resumes',       upload.single('file'), requireRole('student'), ctrl.uploadResume);
router.delete('/resumes/:id',           requireRole('student'), ctrl.deleteResume);
router.get('/resumes/:id/diagnosis',   requireRole('student'), ctrl.getResumeDiagnosis);
router.put('/resumes/:id/default',      requireRole('student'), ctrl.setDefaultResume);
router.put('/resumes/:id/parsed',       requireRole('student'), ctrl.updateParsedResume);
router.post('/resumes/:id/parse',       requireRole('student'), ctrl.parseExistingResume);

// 岗位浏览 - 允许学生和高校管理员
router.get('/jobs',       requireRole(['student', 'school']), ctrl.getJobs);
router.get('/jobs/:id',   requireRole(['student', 'school']), ctrl.getJobDetail);

// 投递与申请 - 仅限学生
router.post('/applications',   requireRole('student'), ctrl.applyJob);
router.get('/applications',    requireRole('student'), ctrl.getMyApplications);
router.get('/contracts',       requireRole('student'), ctrl.getMyContracts);
router.put('/applications/:id/resign', requireRole('student'), ctrl.resignFromJob);

// 区块链核验
const blockchainCtrl = require('../controllers/blockchainController');
router.get('/blockchain/verify/:txHash', blockchainCtrl.verifyTransaction);

module.exports = router;
