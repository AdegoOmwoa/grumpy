// src/routes/sales.js
import express from 'express';
import db from '../database.js';

const router = express.Router();

/**
 * POST /api/sales
 * Record a new sale (unit or bale) and automatically reduce stock
 */
router.post('/', (req, res) => {
  const {
    item_id,
    type,           // 'unit' or 'bale'
    quantity,
    price           // selling price per unit (or per bale if type=bale)
  } = req.body;

  if (!item_id || !type || !quantity || quantity <= 0 || !price) {
    return res.status(400).json({ error: 'Missing or invalid required fields: item_id, type, quantity, price' });
  }

  if (!['unit', 'bale'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "unit" or "bale"' });
  }

  // Start transaction
  db.run('BEGIN TRANSACTION');

  // 1. Get current item data (to calculate correct deduction and validate stock)
  db.get(
    'SELECT total_units, units_per_bale, bale_price, unit_price FROM items WHERE id = ?',
    [item_id],
    (err, item) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      if (!item) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Item not found' });
      }

      // Calculate how many units to deduct
      let unitsToDeduct;
      let effectivePricePerUnit;

      if (type === 'bale') {
        unitsToDeduct = quantity * item.units_per_bale;
        effectivePricePerUnit = item.bale_price / item.units_per_bale; // fallback if no price provided
      } else {
        unitsToDeduct = quantity;
        effectivePricePerUnit = item.unit_price;
      }

      // Use provided price if given, otherwise fallback to stored price
      const salePrice = price || effectivePricePerUnit;

      if (item.total_units < unitsToDeduct) {
        db.run('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient stock',
          available: item.total_units,
          requested: unitsToDeduct
        });
      }

      const totalAmount = quantity * salePrice;

      // 2. Record the sale
      db.run(
        `INSERT INTO sales (item_id, type, quantity, price, total_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [item_id, type, quantity, salePrice, totalAmount],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to record sale', details: err.message });
          }

          const saleId = this.lastID;

          // 3. Reduce stock
          db.run(
            `UPDATE items 
             SET total_units = total_units - ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [unitsToDeduct, item_id],
            function (updateErr) {
              if (updateErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update stock', details: updateErr.message });
              }

              db.run('COMMIT');

              // Return success with basic info
              res.status(201).json({
                sale_id: saleId,
                item_id,
                type,
                quantity,
                price: salePrice,
                total_amount: totalAmount,
                units_deducted: unitsToDeduct,
                message: 'Sale recorded and stock updated successfully'
              });
            }
          );
        }
      );
    }
  );
});

/**
 * GET /api/sales
 * List recent sales (optional: filter by item, date range, etc.)
 */
router.get('/', (req, res) => {
  const { item_id, limit = 50 } = req.query;

  let sql = `
    SELECT 
      s.id, s.item_id, s.type, s.quantity, s.price, s.total_amount, s.created_at,
      i.name AS item_name,
      sub.name AS subcategory_name,
      cat.name AS category_name
    FROM sales s
    JOIN items i ON s.item_id = i.id
    JOIN subcategories sub ON i.subcategory_id = sub.id
    JOIN categories cat ON sub.category_id = cat.id
  `;

  const params = [];

  if (item_id) {
    sql += ' WHERE s.item_id = ?';
    params.push(item_id);
  }

  sql += ' ORDER BY s.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(rows);
  });
});

/**
 * GET /api/sales/:id
 * Get single sale detail
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      s.*,
      i.name AS item_name,
      sub.name AS subcategory_name,
      cat.name AS category_name
    FROM sales s
    JOIN items i ON s.item_id = i.id
    JOIN subcategories sub ON i.subcategory_id = sub.id
    JOIN categories cat ON sub.category_id = cat.id
    WHERE s.id = ?
  `;

  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Sale not found' });
    res.json(row);
  });
});

/**
 * GET /api/sales/item/:itemId
 * Get all sales for a specific item
 */
router.get('/item/:itemId', (req, res) => {
  const { itemId } = req.params;
  const { limit = 20 } = req.query;

  const sql = `
    SELECT * FROM sales 
    WHERE item_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `;

  db.all(sql, [itemId, parseInt(limit)], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

export default router;