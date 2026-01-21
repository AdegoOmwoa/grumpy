import express from 'express';
import db from '../database.js';

const router = express.Router();

// Helper: calculate health
function getHealth(totalUnits, bales, unitsPerBale) {
  const capacity = bales * unitsPerBale;
  if (capacity === 0) return { status: 'unknown', color: 'gray' };
  const perc = totalUnits / capacity;
  return {
    status: perc >= 0.8 ? 'strong' : 'weak',
    color: perc >= 0.8 ? 'blue' : 'orange',
    percentage: (perc * 100).toFixed(1)
  };
}

// GET all items (with hierarchy info)
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      i.*,
      s.name AS subcategory_name,
      c.name AS category_name
    FROM items i
    JOIN subcategories s ON i.subcategory_id = s.id
    JOIN categories c ON s.category_id = c.id
    ORDER BY c.name, s.name, i.name
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const enriched = rows.map(row => {
      const h = getHealth(row.total_units, row.bales_count, row.units_per_bale);
      return {
        ...row,
        health_status: h.status,
        health_color: h.color,
        health_percentage: h.percentage
      };
    });

    res.json(enriched);
  });
});

// POST new item
router.post('/', (req, res) => {
  const {
    subcategory_id,
    name,
    bales_count = 0,
    units_per_bale = 0,
    total_units,
    bale_price = 0,
    unit_price = 0,
    landing_price = 0,
    selling_price = 0
  } = req.body;

  const finalTotal = total_units ?? (bales_count * units_per_bale);
  const health = getHealth(finalTotal, bales_count, units_per_bale);

  const sql = `
    INSERT INTO items (
      subcategory_id, name, bales_count, units_per_bale, total_units,
      bale_price, unit_price, landing_price, selling_price,
      health_status, health_color
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `;

  db.run(sql, [
    subcategory_id, name, bales_count, units_per_bale, finalTotal,
    bale_price, unit_price, landing_price, selling_price,
    health.status, health.color
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID });
  });
});

// PUT update item (especially total_units after sale or manual adjustment)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  let sql = 'UPDATE items SET ';
  const params = [];
  const fields = [];

  for (const [key, value] of Object.entries(updates)) {
    if (['bales_count', 'units_per_bale', 'total_units', 'bale_price', 'unit_price', 'landing_price', 'selling_price'].includes(key)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  // Always update health if relevant fields changed
  if (updates.bales_count !== undefined || updates.units_per_bale !== undefined || updates.total_units !== undefined) {
    // We'll recalculate later in response
    fields.push('updated_at = CURRENT_TIMESTAMP');
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  sql += fields.join(', ') + ' WHERE id = ?';
  params.push(id);

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Return updated record with fresh health
    db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
      if (err || !row) return res.status(404).json({ error: 'Item not found' });
      const h = getHealth(row.total_units, row.bales_count, row.units_per_bale);
      res.json({ ...row, health_status: h.status, health_color: h.color, health_percentage: h.percentage });
    });
  });
});

export default router;