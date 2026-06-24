const { getFirestore } = require('../lib/firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const TRANG_THAI_NEXT = {
  cho_nv_ky_thuat: 'cho_tp_ky_thuat',
  cho_tp_ky_thuat: 'cho_pho_tgd',
  cho_pho_tgd: 'cho_vat_tu',
  cho_vat_tu: 'hoan_thanh',
};

const ROLE_BUOC = {
  nv_ky_thuat: 'cho_nv_ky_thuat',
  tp_ky_thuat: 'cho_tp_ky_thuat',
  pho_tgd: 'cho_pho_tgd',
  vat_tu: 'cho_vat_tu',
};

async function generateMaPhieu(db) {
  const year = new Date().getFullYear();
  const snap = await db.collection('phieu_de_xuat')
    .where('ma_phieu', '>=', `VT-${year}-`)
    .where('ma_phieu', '<', `VT-${year + 1}-`)
    .orderBy('ma_phieu', 'desc')
    .limit(1)
    .get();
  const seq = snap.empty ? 1 : parseInt(snap.docs[0].data().ma_phieu.split('-')[2]) + 1;
  return `VT-${year}-${String(seq).padStart(3, '0')}`;
}

async function taoPhieu(req, res) {
  try {
    const db = getFirestore();
    const { ten_cong_truong, danh_sach_vat_tu, ghi_chu } = req.body;
    if (!ten_cong_truong || !danh_sach_vat_tu?.length) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }
    const ma_phieu = await generateMaPhieu(db);
    const ref = db.collection('phieu_de_xuat').doc();
    const now = new Date().toISOString();
    await ref.set({
      ma_phieu,
      cong_truong_id: req.user.cong_truong_id || req.user.uid,
      ten_cong_truong,
      nguoi_lap: req.user.ho_ten,
      nguoi_lap_uid: req.user.uid,
      ngay_lap: now,
      ghi_chu: ghi_chu || '',
      danh_sach_vat_tu,
      trang_thai: 'cho_nv_ky_thuat',
      lich_su_duyet: [],
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id: ref.id, ma_phieu });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function danhSachPhieu(req, res) {
  try {
    const db = getFirestore();
    const { role, uid } = req.user;
    const { trang_thai } = req.query;
    let query = db.collection('phieu_de_xuat');

    if (role === 'cong_truong') {
      query = query.where('nguoi_lap_uid', '==', uid);
    } else if (trang_thai) {
      query = query.where('trang_thai', '==', trang_thai);
    } else {
      const buoc = ROLE_BUOC[role];
      if (buoc) query = query.where('trang_thai', '==', buoc);
    }

    const snap = await query.get();
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.ten_cong_truong || '').localeCompare(b.ten_cong_truong || '', 'vi'));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function chiTietPhieu(req, res) {
  try {
    const db = getFirestore();
    const snap = await db.collection('phieu_de_xuat').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function duyetPhieu(req, res) {
  try {
    const db = getFirestore();
    const { hanh_dong, ghi_chu } = req.body;
    const { role, ho_ten } = req.user;
    const ref = db.collection('phieu_de_xuat').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });

    const phieu = snap.data();
    const buoc_can = ROLE_BUOC[role];
    if (phieu.trang_thai !== buoc_can) {
      return res.status(400).json({ message: 'Phiếu không ở trạng thái chờ bạn duyệt.' });
    }

    const trang_thai_moi = hanh_dong === 'duyet'
      ? TRANG_THAI_NEXT[phieu.trang_thai]
      : 'tu_choi';

    const buoc_record = {
      buoc: role,
      nguoi_duyet: ho_ten,
      nguoi_duyet_uid: req.user.uid,
      thoi_gian: new Date().toISOString(),
      hanh_dong,
      ghi_chu: ghi_chu || '',
    };

    await ref.update({
      trang_thai: trang_thai_moi,
      lich_su_duyet: FieldValue.arrayUnion(buoc_record),
      updated_at: new Date().toISOString(),
    });

    res.json({ message: 'Thành công.', trang_thai: trang_thai_moi });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function thongKe(req, res) {
  try {
    const db = getFirestore();
    const { role, uid } = req.user;
    const col = db.collection('phieu_de_xuat');

    if (role === 'cong_truong') {
      const snap = await col.where('nguoi_lap_uid', '==', uid).get();
      const all = snap.docs.map((d) => d.data());
      res.json({
        tong: all.length,
        dang_xu_ly: all.filter((p) => !['hoan_thanh','tu_choi'].includes(p.trang_thai)).length,
        hoan_thanh: all.filter((p) => p.trang_thai === 'hoan_thanh').length,
        tu_choi: all.filter((p) => p.trang_thai === 'tu_choi').length,
      });
    } else {
      const buoc = ROLE_BUOC[role];
      const [choSnap, allSnap] = await Promise.all([
        col.where('trang_thai', '==', buoc).get(),
        col.get(),
      ]);
      const today = new Date().toDateString();
      const duyet_hom_nay = allSnap.docs
        .map((d) => d.data())
        .filter((p) => p.lich_su_duyet?.some((h) =>
          h.nguoi_duyet_uid === uid &&
          new Date(h.thoi_gian).toDateString() === today
        )).length;
      res.json({
        cho_duyet: choSnap.size,
        duyet_hom_nay,
        tong_xu_ly: allSnap.docs.filter((d) =>
          d.data().lich_su_duyet?.some((h) => h.nguoi_duyet_uid === uid)
        ).length,
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function tatCaPhieu(req, res) {
  try {
    const db = getFirestore();
    const snap = await db.collection('phieu_de_xuat').orderBy('created_at', 'desc').get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function xoaPhieu(req, res) {
  try {
    const db = getFirestore();
    const ref = db.collection('phieu_de_xuat').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
    await ref.delete();
    res.json({ message: 'Đã xóa phiếu.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function lichSuPhieu(req, res) {
  try {
    const db = getFirestore();
    const { role, uid } = req.user;
    let query = db.collection('phieu_de_xuat')
      .where('trang_thai', 'in', ['hoan_thanh', 'tu_choi']);

    if (role === 'cong_truong') {
      query = db.collection('phieu_de_xuat')
        .where('nguoi_lap_uid', '==', uid)
        .where('trang_thai', 'in', ['hoan_thanh', 'tu_choi']);
    }

    const snap = await query.get();
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

async function suaVatTu(req, res) {
  try {
    const db = getFirestore();
    const { danh_sach_vat_tu } = req.body;
    if (!Array.isArray(danh_sach_vat_tu) || danh_sach_vat_tu.length === 0) {
      return res.status(400).json({ message: 'Danh sách vật tư không hợp lệ.' });
    }
    const ref = db.collection('phieu_de_xuat').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });
    const trangThai = snap.data().trang_thai;
    const role = req.user.role;
    const allowed =
      (role === 'nv_ky_thuat' && trangThai === 'cho_nv_ky_thuat') ||
      (role === 'tp_ky_thuat' && trangThai === 'cho_tp_ky_thuat');
    if (!allowed) {
      return res.status(400).json({ message: 'Không có quyền sửa vật tư ở bước này.' });
    }
    await ref.update({ danh_sach_vat_tu, updated_at: new Date().toISOString() });
    res.json({ message: 'Đã cập nhật danh sách vật tư.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
}

module.exports = { taoPhieu, danhSachPhieu, chiTietPhieu, duyetPhieu, thongKe, suaVatTu, lichSuPhieu, tatCaPhieu, xoaPhieu };
