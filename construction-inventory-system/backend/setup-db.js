const { getDbConnection } = require('./db');

async function setupDatabase() {
  const db = await getDbConnection();
  
  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON');
  
  // Create Parts010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Parts010 (
      partNo010 INTEGER PRIMARY KEY AUTOINCREMENT,
      descrPart TEXT NOT NULL,
      pricePart DECIMAL(10,2) NOT NULL,
      qoh INTEGER NOT NULL
    )
  `);
  
  // Create Clients010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Clients010 (
      clientId010 INTEGER PRIMARY KEY AUTOINCREMENT,
      clientName TEXT NOT NULL,
      clientPhone TEXT NOT NULL,
      moneyOwed DECIMAL(10,2) NOT NULL DEFAULT 0
    )
  `);
  
  // Create POs010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS POs010 (
      poNo010 INTEGER PRIMARY KEY AUTOINCREMENT,
      clientCompID INTEGER NOT NULL,
      dateOfPO DATE NOT NULL DEFAULT CURRENT_DATE,
      statusPO TEXT NOT NULL,
      FOREIGN KEY (clientCompID) REFERENCES Clients010(clientId010)
    )
  `);
  
  // Create Lines010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Lines010 (
      poNo010 INTEGER NOT NULL,
      lineNo010 INTEGER NOT NULL,
      partNo010 INTEGER NOT NULL,
      qtyOrdered INTEGER NOT NULL,
      priceOrdered DECIMAL(10,2) NOT NULL,
      PRIMARY KEY (poNo010, lineNo010),
      FOREIGN KEY (poNo010) REFERENCES POs010(poNo010),
      FOREIGN KEY (partNo010) REFERENCES Parts010(partNo010)
    )
  `);
  
  // Create trigger to update moneyOwed in Clients010
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_money_owed
    AFTER INSERT ON Lines010
    BEGIN
      UPDATE Clients010
      SET moneyOwed = moneyOwed + (NEW.qtyOrdered * NEW.priceOrdered)
      WHERE clientId010 = (
        SELECT clientCompID 
        FROM POs010 
        WHERE poNo010 = NEW.poNo010
      );
    END
  `);
  
  // Insert sample data into Parts010
  const partsCount = await db.get('SELECT COUNT(*) as count FROM Parts010');
  if (partsCount.count === 0) {
    await db.exec(`
      INSERT INTO Parts010 (descrPart, pricePart, qoh) VALUES
      ('Concrete Mix 50lb', 15.99, 100),
      ('Steel Beam 10ft', 120.50, 25),
      ('Lumber 2x4x8', 5.75, 200),
      ('Interior Paint 1gal - White', 28.99, 50),
      ('Drywall Sheet 4x8', 12.25, 75),
      ('Roof Shingles Bundle', 32.50, 60),
      ('PVC Pipe 10ft', 8.95, 120),
      ('Insulation Roll R-30', 45.75, 40),
      ('Door Knob Set - Brass', 22.99, 30),
      ('Window 36x48 Double-Hung', 189.99, 15)
    `);
    console.log('Sample Parts010 data inserted');
  }
  
  // Insert sample data into Clients010
  const clientsCount = await db.get('SELECT COUNT(*) as count FROM Clients010');
  if (clientsCount.count === 0) {
    await db.exec(`
      INSERT INTO Clients010 (clientName, clientPhone, moneyOwed) VALUES
      ('ABC Construction Co.', '555-123-4567', 0),
      ('XYZ Builders Inc.', '555-987-6543', 0),
      ('HomeMax Renovations', '555-246-8135', 0),
      ('Citywide Contractors', '555-369-1472', 0),
      ('Dream Home Builders', '555-753-9510', 0)
    `);
    console.log('Sample Clients010 data inserted');
  }
  
  // Insert sample data into POs010
  const posCount = await db.get('SELECT COUNT(*) as count FROM POs010');
  if (posCount.count === 0) {
    await db.exec(`
      INSERT INTO POs010 (clientCompID, dateOfPO, statusPO) VALUES
      (1, '2025-05-15', 'Completed'),
      (2, '2025-05-20', 'Pending'),
      (3, '2025-05-25', 'Processing'),
      (4, '2025-05-30', 'Pending')
    `);
    console.log('Sample POs010 data inserted');
  }
  
  // Insert sample data into Lines010
  const linesCount = await db.get('SELECT COUNT(*) as count FROM Lines010');
  if (linesCount.count === 0) {
    await db.exec(`
      -- Lines for PO #1 (ABC Construction)
      INSERT INTO Lines010 (poNo010, lineNo010, partNo010, qtyOrdered, priceOrdered) VALUES
      (1, 1, 1, 10, 15.99),
      (1, 2, 3, 50, 5.75),
      (1, 3, 5, 20, 12.25),
      
      -- Lines for PO #2 (XYZ Builders)
      (2, 1, 2, 5, 120.50),
      (2, 2, 4, 10, 28.99),
      (2, 3, 6, 15, 32.50),
      
      -- Lines for PO #3 (HomeMax Renovations)
      (3, 1, 7, 30, 8.95),
      (3, 2, 8, 10, 45.75),
      
      -- Lines for PO #4 (Citywide Contractors)
      (4, 1, 9, 15, 22.99),
      (4, 2, 10, 5, 189.99)
    `);
    
    // Update moneyOwed values manually to reflect the purchase orders
    await db.exec(`
      UPDATE Clients010 SET moneyOwed = 809.65 WHERE clientId010 = 1;
      UPDATE Clients010 SET moneyOwed = 1089.90 WHERE clientId010 = 2;
      UPDATE Clients010 SET moneyOwed = 726.00 WHERE clientId010 = 3;
      UPDATE Clients010 SET moneyOwed = 1294.80 WHERE clientId010 = 4;
    `);
    
    console.log('Sample Lines010 data inserted');
  }
  
  console.log('Database setup complete!');
  await db.close();
}

setupDatabase().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});