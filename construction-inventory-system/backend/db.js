const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// Create database connection
async function getDbConnection() {
  return open({
    filename: path.join(__dirname, 'inventory010.sqlite'),
    driver: sqlite3.Database
  });
}

module.exports = { getDbConnection };