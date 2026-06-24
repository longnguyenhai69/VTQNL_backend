require('dotenv').config();
const express = require('express');
const cors = require('cors');
const phieuRoutes = require('./routes/phieu');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'https://vtqnl-frontend-4uhb.vercel.app',
    ];
    if (!origin || allowed.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', phieuRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Lỗi server.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend đang chạy tại http://localhost:${PORT}`));
