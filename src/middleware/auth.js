const { getAuth, getFirestore } = require('../lib/firebase-admin');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực.' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    const snap = await getFirestore().collection('users').doc(decoded.uid).get();
    if (!snap.exists) return res.status(403).json({ message: 'Tài khoản chưa được cấu hình.' });
    req.user = { uid: decoded.uid, ...snap.data() };
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Không có quyền thực hiện hành động này.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
