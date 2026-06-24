require('dotenv').config();
const express = require('express');
const cors = require('cors');
const phieuRoutes = require('./routes/phieu');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
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
