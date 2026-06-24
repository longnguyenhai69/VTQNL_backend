const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', ctrl.danhSachUsers);
router.post('/', ctrl.taoUser);
router.patch('/:uid', ctrl.suaUser);
router.delete('/:uid', ctrl.xoaUser);

module.exports = router;
