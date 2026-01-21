import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./duka.db', (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('Connected to SQLite database');
});

db.serialize(() => {
  // 1. Categories
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Subcategories
  db.run(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(category_id, name),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // 3. Items (where stock lives)
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subcategory_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bales_count INTEGER DEFAULT 0,
      units_per_bale INTEGER DEFAULT 0,
      total_units INTEGER DEFAULT 0,
      bale_price REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      landing_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      health_status TEXT DEFAULT 'strong',
      health_color TEXT DEFAULT 'blue',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(subcategory_id, name),
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
    )
  `);

  // 4. Sales log
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('unit', 'bale')),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);
});

// // Temporary: clear all data (run once!)
// db.run("DELETE FROM sales");
// db.run("DELETE FROM items");
// db.run("DELETE FROM subcategories");
// db.run("DELETE FROM categories");

// Optional: reset auto-increment counters
db.run("DELETE FROM sqlite_sequence WHERE name IN ('categories', 'subcategories', 'items', 'sales')");

// src/database.js
// ... (your existing imports and CREATE TABLE statements remain the same)

// ────────────────────────────────────────────────
// Optional: Seed initial categories & subcategories (runs only if tables are empty)
// ────────────────────────────────────────────────

db.serialize(() => {
  // Check if categories table is empty
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (err) {
      console.error("Error checking categories count:", err);
      return;
    }

    if (row.count === 0) {
      console.log("Seeding initial categories and subcategories...");

      // Insert categories
      const categories = [
        "Books",
        "Stationary",
        "Flours",
        "Cooking Oil",
        "Detergents",
        "Beverages"
      ];

      categories.forEach(catName => {
        db.run(
          "INSERT INTO categories (name) VALUES (?)",
          [catName],
          function (err) {
            if (err) {
              console.error(`Error inserting category "${catName}":`, err);
              return;
            }

            const catId = this.lastID;
            console.log(`Added category: ${catName} (id=${catId})`);

            // Add subcategories depending on category
            let subcategories = [];

            if (catName === "Books") {
              subcategories = ["A4", "A5", "Exercise Books", "Text Books", "Novels"];
            } else if (catName === "Stationary") {
              subcategories = ["Pens", "Pencils", "Markers", "Notebooks", "Rulers", "Erasers"];
            } else if (catName === "Flours") {
              subcategories = ["Self Raising", "All Purpose", "Maize Flour", "Cassava Flour"];
            } else if (catName === "Cooking Oil") {
              subcategories = ["1L", "2L", "5L", "Sunflower", "Vegetable"];
            } else if (catName === "Detergents") {
              subcategories = ["Laundry Powder", "Liquid Dishwash", "Bar Soap", "Toilet Cleaner"];
            } else if (catName === "Beverages") {
              subcategories = ["Sodas", "Juices", "Water", "Energy Drinks"];
            }

            subcategories.forEach(subName => {
              db.run(
                "INSERT INTO subcategories (category_id, name) VALUES (?, ?)",
                [catId, subName],
                function (subErr) {
                  if (subErr) {
                    console.error(`Error inserting subcategory "${subName}":`, subErr);
                  } else {
                    console.log(`  └─ Added subcategory: ${subName} (id=${this.lastID})`);
                  }
                }
              );
            });
          }
        );
      });
    } else {
      console.log("Categories already exist → skipping seed");
    }
  });
});

export default db;