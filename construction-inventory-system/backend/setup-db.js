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
      qoh INTEGER DEFAULT 0
    )
  `);
  
  // Create Clients010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Clients010 (
      clientId010 INTEGER PRIMARY KEY AUTOINCREMENT,
      clientName TEXT NOT NULL,
      clientPhone TEXT,
      moneyOwed DECIMAL(10,2) DEFAULT 0
    )
  `);
  
  // Create POs010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS POs010 (
      poNo010 INTEGER PRIMARY KEY AUTOINCREMENT,
      clientCompID INTEGER NOT NULL,
      dateOfPO DATETIME DEFAULT CURRENT_TIMESTAMP,
      statusPO TEXT DEFAULT 'Pending',
      FOREIGN KEY (clientCompID) REFERENCES Clients010(clientId010)
    )
  `);
  
  // Create Lines010 table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Lines010 (
      poNo010 INTEGER,
      lineNo010 INTEGER,
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
      ('Concrete Mix', 15.99, 100),
      ('Steel Beam', 120.50, 25),
      ('Lumber 2x4', 5.75, 200),
      ('Paint - White', 28.99, 50),
      ('Drywall Sheet', 12.25, 75)
    `);
  }
  
  // Insert sample data into Clients010
  const clientsCount = await db.get('SELECT COUNT(*) as count FROM Clients010');
  if (clientsCount.count === 0) {
    await db.exec(`
      INSERT INTO Clients010 (clientName, clientPhone, moneyOwed) VALUES
      ('ABC Construction', '555-123-4567', 0),
      ('XYZ Builders', '555-987-6543', 0),
      ('HomeMax Renovations', '555-246-8135', 0)
    `);
  }
  
  console.log('Database setup complete!');
  await db.close();
}

setupDatabase().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});