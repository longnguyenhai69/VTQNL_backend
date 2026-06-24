const ExcelJS = require('exceljs');
const { getFirestore } = require('../lib/firebase-admin');

const BUOC_LABELS = {
  nv_ky_thuat: 'Nhân viên kỹ thuật',
  tp_ky_thuat: 'Trưởng phòng kỹ thuật',
  pho_tgd: 'Phó TGĐ',
  vat_tu: 'Phòng vật tư',
};

const C = {
  primary:   '1E3A5F',
  white:     'FFFFFF',
  subhead:   'D6E4F7',
  subtext:   '1E3A5F',
  rowAlt:    'EFF6FF',
  doneBg:    'D1FAE5',
  doneFg:    '065F46',
  rejectBg:  'FEE2E2',
  rejectFg:  '991B1B',
  border:    'BFDBFE',
  text:      '1E293B',
};

function bord(color = C.border) {
  return { style: 'thin', color: { argb: 'FF' + color } };
}
function allBorders(cell, color) {
  const b = bord(color);
  cell.border = { top: b, left: b, bottom: b, right: b };
}

function titleRow(ws, text, cols) {
  ws.mergeCells(`A1:${String.fromCharCode(64 + cols)}1`);
  const c = ws.getCell('A1');
  c.value = text;
  c.font = { bold: true, size: 16, color: { argb: 'FF' + C.white } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C.primary } };
  c.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 38;
}

function hCell(cell, value, bg = C.primary, fg = C.white) {
  cell.value = value;
  cell.font = { bold: true, size: 10, color: { argb: 'FF' + fg } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  allBorders(cell);
}

function dCell(cell, value, bg = C.white, bold = false, align = 'left') {
  cell.value = value ?? '';
  cell.font = { bold, size: 10, color: { argb: 'FF' + C.text } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  allBorders(cell);
}

async function exportPhieu(req, res) {
  try {
    const snap = await getFirestore().collection('phieu_de_xuat').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ message: 'Không tìm thấy phiếu.' });

    const p = { id: snap.id, ...snap.data() };
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Hệ thống XNVT';

    /* ── SHEET 1: PHIẾU ĐỀ XUẤT ── */
    const ws1 = wb.addWorksheet('Phiếu đề xuất');
    ws1.columns = [
      { width: 6 },
      { width: 32 },
      { width: 14 },
      { width: 12 },
      { width: 36 },
    ];

    titleRow(ws1, 'PHIẾU ĐỀ XUẤT VẬT TƯ', 5);

    const infoData = [
      ['Mã phiếu', p.ma_phieu],
      ['Công trường', p.ten_cong_truong],
      ['Người lập', p.nguoi_lap],
      ['Ngày lập', p.ngay_lap ? new Date(p.ngay_lap).toLocaleDateString('vi-VN') : ''],
      ['Trạng thái', 'Hoàn thành'],
      ['Ghi chú', p.ghi_chu || ''],
    ];

    infoData.forEach(([label, val], i) => {
      const r = i + 2;
      ws1.getRow(r).height = 22;
      ws1.mergeCells(`C${r}:E${r}`);
      dCell(ws1.getCell(`A${r}`), '', C.rowAlt);
      hCell(ws1.getCell(`B${r}`), label, C.subhead, C.subtext);
      dCell(ws1.getCell(`C${r}`), val, C.rowAlt, true);
    });

    // Tiêu đề bảng vật tư
    const vtHead = 9;
    ws1.getRow(vtHead).height = 28;
    ws1.mergeCells(`A${vtHead}:E${vtHead}`);
    hCell(ws1.getCell(`A${vtHead}`), 'DANH SÁCH VẬT TƯ ĐỀ XUẤT', C.primary, C.white);

    const colRow = vtHead + 1;
    ws1.getRow(colRow).height = 24;
    ['STT', 'Tên vật tư', 'Đơn vị', 'Số lượng', 'Mô tả'].forEach((h, ci) => {
      hCell(ws1.getCell(colRow, ci + 1), h, C.subhead, C.subtext);
    });

    (p.danh_sach_vat_tu || []).forEach((item, idx) => {
      const r = colRow + 1 + idx;
      const bg = idx % 2 === 0 ? C.white : C.rowAlt;
      ws1.getRow(r).height = 20;
      dCell(ws1.getCell(r, 1), idx + 1, bg, false, 'center');
      dCell(ws1.getCell(r, 2), item.ten_vat_tu, bg);
      dCell(ws1.getCell(r, 3), item.don_vi, bg, false, 'center');
      dCell(ws1.getCell(r, 4), Number(item.so_luong), bg, false, 'center');
      dCell(ws1.getCell(r, 5), item.mo_ta || '', bg);
    });

    /* ── SHEET 2: LỊCH SỬ DUYỆT ── */
    const ws2 = wb.addWorksheet('Lịch sử duyệt');
    ws2.columns = [
      { width: 26 },
      { width: 26 },
      { width: 14 },
      { width: 24 },
      { width: 36 },
    ];

    titleRow(ws2, `LỊCH SỬ DUYỆT — ${p.ma_phieu}`, 5);

    ws2.getRow(2).height = 24;
    ['Bước duyệt', 'Người duyệt', 'Hành động', 'Thời gian', 'Ghi chú'].forEach((h, ci) => {
      hCell(ws2.getCell(2, ci + 1), h, C.subhead, C.subtext);
    });

    (p.lich_su_duyet || []).forEach((item, idx) => {
      const r = 3 + idx;
      const isDuyet = item.hanh_dong === 'duyet';
      const bg = isDuyet ? C.doneBg : C.rejectBg;
      const fg = isDuyet ? C.doneFg : C.rejectFg;
      ws2.getRow(r).height = 22;

      dCell(ws2.getCell(r, 1), BUOC_LABELS[item.buoc] || item.buoc, bg);
      dCell(ws2.getCell(r, 2), item.nguoi_duyet, bg);

      const ac = ws2.getCell(r, 3);
      ac.value = isDuyet ? '✔ Đã duyệt' : '✘ Từ chối';
      ac.font = { bold: true, size: 10, color: { argb: 'FF' + fg } };
      ac.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
      ac.alignment = { vertical: 'middle', horizontal: 'center' };
      allBorders(ac);

      dCell(ws2.getCell(r, 4), item.thoi_gian ? new Date(item.thoi_gian).toLocaleString('vi-VN') : '', bg, false, 'center');
      dCell(ws2.getCell(r, 5), item.ghi_chu || '', bg);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${p.ma_phieu}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi khi xuất Excel.' });
  }
}

module.exports = { exportPhieu };
