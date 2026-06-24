const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/phieuController');
const { exportPhieu } = require('../controllers/exportController');

router.use(authenticate);

router.get('/stats', ctrl.thongKe);
router.get('/phieu/cua-toi', requireRole('cong_truong'), ctrl.danhSachPhieu);
router.get('/phieu/lich-su', ctrl.lichSuPhieu);
router.get('/phieu/tat-ca', requireRole('admin'), ctrl.tatCaPhieu);
router.delete('/phieu/:id', requireRole('admin'), ctrl.xoaPhieu);
router.get('/phieu', ctrl.danhSachPhieu);
router.post('/phieu', requireRole('cong_truong'), ctrl.taoPhieu);
router.get('/phieu/:id', ctrl.chiTietPhieu);
router.get('/phieu/:id/export', exportPhieu);
router.patch('/phieu/:id/vat-tu', requireRole('nv_ky_thuat', 'tp_ky_thuat'), ctrl.suaVatTu);
router.patch('/phieu/:id/duyet', requireRole('nv_ky_thuat', 'tp_ky_thuat', 'pho_tgd', 'vat_tu'), ctrl.duyetPhieu);

module.exports = router;
