// src/routes/subcategories.js
import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET all subcategories (optional: filter by category_id)
router.get('/', (req, res) => {
  const { category_id } = req.query;

  let sql = 'SELECT * FROM subcategories ORDER BY name';
  let params = [];

  if (category_id) {
    sql = 'SELECT * FROM subcategories WHERE category_id = ? ORDER BY name';
    params = [category_id];
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST new subcategory
router.post('/', (req, res) => {
  const { category_id, name } = req.body;

  if (!category_id || !name?.trim()) {
    return res.status(400).json({ error: 'category_id and name are required' });
  }

  db.run(
    'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
    [category_id, name.trim()],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        category_id,
        name
      });
    }
  );
});

// Optional: GET one subcategory
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    'SELECT * FROM subcategories WHERE id = ?',
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Subcategory not found' });
      res.json(row);
    }
  );
});

export default router;   // ← This line is required!