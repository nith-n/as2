const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

// listParts010() - Returns all parts from Parts010
router.get('/parts', async (req, res) => {
  try {
    const db = await getDbConnection();
    const parts = await db.all('SELECT * FROM Parts010');
    await db.close();
    res.json(parts);
  } catch (error) {
    console.error('Error in listParts010:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// listPOs010() - Returns basic info of all POs from POs010
router.get('/pos', async (req, res) => {
  try {
    const db = await getDbConnection();
    const pos = await db.all(`
      SELECT p.poNo010, p.dateOfPO, p.statusPO, c.clientName 
      FROM POs010 p
      JOIN Clients010 c ON p.clientCompID = c.clientId010
    `);
    await db.close();
    res.json(pos);
  } catch (error) {
    console.error('Error in listPOs010:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// listPOinfo010(poNumber) - Returns detailed info of a specific PO
router.get('/pos/:poNo', async (req, res) => {
  const poNo = req.params.poNo;
  
  try {
    const db = await getDbConnection();
    
    // Get PO header information
    const poHeader = await db.get(`
      SELECT p.poNo010, p.dateOfPO, p.statusPO, 
             c.clientId010, c.clientName, c.clientPhone
      FROM POs010 p
      JOIN Clients010 c ON p.clientCompID = c.clientId010
      WHERE p.poNo010 = ?
    `, [poNo]);
    
    if (!poHeader) {
      await db.close();
      return res.status(404).json({ error: `Purchase Order #${poNo} not found` });
    }
    
    // Get PO line items
    const poLines = await db.all(`
      SELECT l.lineNo010, l.qtyOrdered, l.priceOrdered,
             p.partNo010, p.descrPart
      FROM Lines010 l
      JOIN Parts010 p ON l.partNo010 = p.partNo010
      WHERE l.poNo010 = ?
      ORDER BY l.lineNo010
    `, [poNo]);
    
    // Calculate total
    let total = 0;
    poLines.forEach(line => {
      total += line.qtyOrdered * line.priceOrdered;
    });
    
    await db.close();
    res.json({
      poHeader,
      poLines,
      total
    });
  } catch (error) {
    console.error('Error in listPOinfo010:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// submitPO010(orderData) - Validates and stores a new PO
router.post('/pos', async (req, res) => {
  const { clientId, lines } = req.body;
  
  // Validate request body
  if (!clientId || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid request. Must include clientId and at least one line item' 
    });
  }
  
  const db = await getDbConnection();
  
  try {
    // Start transaction
    await db.exec('BEGIN TRANSACTION');
    
    // Validate client exists
    const client = await db.get('SELECT clientId010 FROM Clients010 WHERE clientId010 = ?', [clientId]);
    if (!client) {
      await db.exec('ROLLBACK');
      await db.close();
      return res.status(400).json({ error: `Client ID ${clientId} not found` });
    }
    
    // Validate all parts and quantities
    for (const line of lines) {
      if (!line.partNo || !line.qty || line.qty <= 0) {
        await db.exec('ROLLBACK');
        await db.close();
        return res.status(400).json({ error: 'Each line item must have a valid partNo and qty > 0' });
      }
      
      const part = await db.get('SELECT partNo010, descrPart, pricePart, qoh FROM Parts010 WHERE partNo010 = ?', 
        [line.partNo]);
      
      if (!part) {
        await db.exec('ROLLBACK');
        await db.close();
        return res.status(400).json({ error: `Part #${line.partNo} not found` });
      }
      
      if (part.qoh < line.qty) {
        await db.exec('ROLLBACK');
        await db.close();
        return res.status(400).json({ 
          error: `Insufficient quantity for part #${line.partNo} (${part.descrPart}). Available: ${part.qoh}, Requested: ${line.qty}` 
        });
      }
    }
    
    // Insert PO header
    const result = await db.run(`
      INSERT INTO POs010 (clientCompID, dateOfPO, statusPO)
      VALUES (?, CURRENT_TIMESTAMP, 'New')
    `, [clientId]);
    
    const poNo = result.lastID;
    
    // Insert line items and update inventory
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;
      
      // Get current price of part
      const part = await db.get('SELECT pricePart FROM Parts010 WHERE partNo010 = ?', [line.partNo]);
      
      // Insert line item
      await db.run(`
        INSERT INTO Lines010 (poNo010, lineNo010, partNo010, qtyOrdered, priceOrdered)
        VALUES (?, ?, ?, ?, ?)
      `, [poNo, lineNo, line.partNo, line.qty, part.pricePart]);
      
      // Update inventory quantity
      await db.run(`
        UPDATE Parts010
        SET qoh = qoh - ?
        WHERE partNo010 = ?
      `, [line.qty, line.partNo]);
    }
    
    // Commit transaction
    await db.exec('COMMIT');
    await db.close();
    
    res.status(201).json({ 
      success: true,
      message: 'Purchase order created successfully',
      poNo: poNo
    });
  } catch (error) {
    await db.exec('ROLLBACK');
    await db.close();
    console.error('Error in submitPO010:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all clients for dropdowns
router.get('/clients', async (req, res) => {
  try {
    const db = await getDbConnection();
    const clients = await db.all('SELECT * FROM Clients010');
    await db.close();
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;