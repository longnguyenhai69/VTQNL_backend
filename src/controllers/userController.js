const { getAuth, getFirestore } = require('../lib/firebase-admin');

async function danhSachUsers(req, res) {
  try {
    const snap = await getFirestore().collection('users').get();
    const users = snap.docs.map((d) => d.data());
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function taoUser(req, res) {
  try {
    const { email, password, ho_ten, role, ten_cong_truong } = req.body;
    if (!email || !password || !ho_ten || !role) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }
    const userRecord = await getAuth().createUser({ email, password });
    const uid = userRecord.uid;
    const data = {
      uid, email, ho_ten, role,
      ...(role === 'cong_truong' && ten_cong_truong ? { ten_cong_truong, cong_truong_id: uid } : {}),
    };
    await getFirestore().collection('users').doc(uid).set(data);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    const message = err.code === 'auth/email-already-exists'
      ? 'Email đã tồn tại.'
      : err.code === 'auth/invalid-password'
      ? 'Mật khẩu phải có ít nhất 6 ký tự.'
      : 'Lỗi server.';
    res.status(400).json({ message });
  }
}

async function suaUser(req, res) {
  try {
    const { uid } = req.params;
    const { ho_ten, role, ten_cong_truong, password } = req.body;

    if (password) {
      await getAuth().updateUser(uid, { password });
    }

    const data = {
      ho_ten, role,
      ...(role === 'cong_truong' && ten_cong_truong
        ? { ten_cong_truong, cong_truong_id: uid }
        : { ten_cong_truong: null }),
    };
    await getFirestore().collection('users').doc(uid).update(data);
    res.json({ message: 'Đã cập nhật tài khoản.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function xoaUser(req, res) {
  try {
    const { uid } = req.params;
    if (uid === req.user.uid) {
      return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình.' });
    }
    await getAuth().deleteUser(uid);
    await getFirestore().collection('users').doc(uid).delete();
    res.json({ message: 'Đã xóa tài khoản.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

module.exports = { danhSachUsers, taoUser, suaUser, xoaUser };
