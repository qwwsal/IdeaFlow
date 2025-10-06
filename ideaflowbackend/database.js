const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./mydatabase.db', (err) => {
  if (err) {
    console.error('Ошибка при открытии базы данных:', err.message);
  } else {
    console.log('База данных успешно открыта');

    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        photo TEXT,
        description TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT, -- JSON string of file paths
        status TEXT DEFAULT 'open',
        executorId INTEGER,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS ProcessedCases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'in_process',
        executorEmail TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(caseId) REFERENCES Cases(id),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS Projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caseId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        description TEXT,
        cover TEXT,
        files TEXT,
        status TEXT DEFAULT 'closed',
        executorEmail TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES Users(id),
        FOREIGN KEY(caseId) REFERENCES Cases(id)
      )
    `);
  }
});

module.exports = db;
