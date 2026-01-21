import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import categoriesRouter from './routes/categories.js';
import subcategoriesRouter from './routes/subcategories.js';
import itemsRouter from './routes/items.js';
import salesRouter from './routes/sales.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/categories', categoriesRouter);
app.use('/api/subcategories', subcategoriesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/sales', salesRouter);

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/audit', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/audit.html'));
});

app.listen(PORT, () => {
  console.log(`Duka Audit running → http://localhost:${PORT}`);
  console.log(`Audit page     → http://localhost:${PORT}/audit`);
});