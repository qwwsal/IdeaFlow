const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = 3001;

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Создаем папку uploads, если нет
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());

// Раздача статики из uploads
app.use('/uploads', express.static(uploadsDir));

// Настройка multer для файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Парсинг JSON тела
app.use(express.json());

// Регистрация
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO Users (email, password) VALUES (?, ?)', [email, hash], function (err) {
      if (err) return res.status(400).json({ error: 'Email уже зарегистрирован' });
      res.json({ id: this.lastID, email });
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM Users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Неверный пароль' });
    res.json({ id: user.id, email: user.email });
  });
});

// Профиль
app.get('/profile/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT id, email, firstName, lastName, photo, description FROM Users WHERE id = ?', [id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  });
});

app.put('/profile/:id', (req, res) => {
  const id = req.params.id;
  const { firstName, lastName, photo, description } = req.body;
  db.run(
    'UPDATE Users SET firstName = ?, lastName = ?, photo = ?, description = ? WHERE id = ?',
    [firstName, lastName, photo, description, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Ошибка обновления профиля' });
      res.json({ message: 'Профиль успешно обновлён' });
    }
  );
});

// Создание кейса
const uploadCaseFiles = upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'files', maxCount: 15 }]);
app.post('/cases', uploadCaseFiles, (req, res) => {
  const { userId, title, theme, description } = req.body;
  if (!userId || !title)
    return res.status(400).json({ error: 'userId и title обязательны' });

  let coverPath = null;
  if (req.files.cover && req.files.cover[0])
    coverPath = `/uploads/${req.files.cover[0].filename}`;

  let filesPaths = [];
  if (req.files.files)
    filesPaths = req.files.files.map(file => `/uploads/${file.filename}`);

  const stmt = db.prepare(
    `INSERT INTO Cases (userId, title, theme, description, cover, files, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(userId, title, theme || '', description || '', coverPath, JSON.stringify(filesPaths), 'open', function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка при сохранении кейса' });
    }
    res.json({ id: this.lastID, message: 'Кейс успешно создан' });
  });
});

// Получение кейсов с фильтрацией
app.get('/cases', (req, res) => {
  const userId = req.query.userId;
  const executorId = req.query.executorId;
  let sql = `
    SELECT Cases.*, Users.email as userEmail
    FROM Cases
    LEFT JOIN Users ON Cases.userId = Users.id
  `;
  const params = [];
  const conditions = [];
  if (userId) {
    conditions.push('Cases.userId = ?');
    params.push(userId);
  }
  if (executorId) {
    conditions.push('Cases.executorId = ?');
    params.push(executorId);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении кейсов' });
    rows.forEach(row => {
      row.files = row.files ? JSON.parse(row.files) : [];
    });
    res.json(rows);
  });
});

// Детали кейса
app.get('/cases/:id', (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT Cases.*, Users.email as userEmail
    FROM Cases
    LEFT JOIN Users ON Cases.userId = Users.id
    WHERE Cases.id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении кейса:', err);
      return res.status(500).json({ error: 'Ошибка при получении кейса' });
    }
    if (!row) return res.status(404).json({ error: 'Кейс не найден' });
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  });
});

// Принять кейс
app.put('/cases/:id/accept', (req, res) => {
  const caseId = Number(req.params.id);
  const { executorId } = req.body;

  console.log('Принятие кейса:', { caseId, executorId });

  if (!executorId || typeof executorId !== 'number' || isNaN(executorId)) {
    console.error('executorId отсутствует или не число:', executorId);
    return res.status(400).json({ error: 'executorId обязателен и должен быть числом' });
  }
  if (!caseId || isNaN(caseId)) {
    console.error('caseId отсутствует или не число:', caseId);
    return res.status(400).json({ error: 'Неверный id кейса' });
  }

  const sql = 'UPDATE Cases SET status = ?, executorId = ? WHERE id = ?';

  db.run(sql, ['in_process', executorId, caseId], function (err) {
    if (err) {
      console.error('Ошибка обновления кейса:', err);
      return res.status(500).json({ error: 'Ошибка обновления кейса' });
    }
    if (this.changes === 0) {
      console.warn('Кейс для обновления не найден:', caseId);
      return res.status(404).json({ error: 'Кейс не найден' });
    }
    console.log(`Кейс ${caseId} принят исполнителем ${executorId}`);
    res.json({ message: 'Кейс принят', caseId });
  });
});

// Загрузка дополнительных файлов к кейсу
const uploadExtraFiles = upload.array('extraFiles', 15);
app.post('/cases/:id/upload-files', uploadExtraFiles, (req, res) => {
  const caseId = req.params.id;
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Файлы не выбраны' });

  db.get('SELECT files FROM Cases WHERE id = ?', [caseId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
    if (!row) return res.status(404).json({ error: 'Кейс не найден' });
    let existingFiles = row.files ? JSON.parse(row.files) : [];
    const newFiles = req.files.map(file => `/uploads/${file.filename}`);
    const updatedFiles = existingFiles.concat(newFiles);

    db.run('UPDATE Cases SET files = ? WHERE id = ?', [JSON.stringify(updatedFiles), caseId], err => {
      if (err) return res.status(500).json({ error: 'Ошибка сохранения файлов' });
      res.json({ message: 'Файлы добавлены', files: updatedFiles });
    });
  });
});

// Завершение кейса (создание проекта)
app.put('/cases/:id/complete', (req, res) => {
  const caseId = req.params.id;
  const { userId, title, theme, description, cover, files } = req.body;

  // Получить кейс вместе с executorId
  db.get('SELECT * FROM Cases WHERE id = ? AND executorId = ?', [caseId, userId], (err, caseRow) => {
    if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
    if (!caseRow) return res.status(404).json({ error: 'Кейс не найден или не назначен вам' });

    // Получить email исполнителя по executorId
    db.get('SELECT email FROM Users WHERE id = ?', [userId], (err, userRow) => {
      if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
      const executorEmail = userRow ? userRow.email : null;

      // Вставить проект с executorEmail
      const stmt = db.prepare(`INSERT INTO Projects (caseId, userId, title, theme, description, cover, files, status, executorEmail)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      stmt.run(
        caseId,
        userId,
        title || caseRow.title,
        theme || caseRow.theme,
        description || caseRow.description,
        cover || caseRow.cover,
        files ? JSON.stringify(files) : caseRow.files,
        'completed',
        executorEmail,
        function (err) {
          if (err) return res.status(500).json({ error: 'Ошибка создания проекта' });

          // Обновить статус кейса
          db.run('UPDATE Cases SET status = ? WHERE id = ?', ['closed', caseId], err => {
            if (err) return res.status(500).json({ error: 'Ошибка обновления кейса' });
            res.json({ message: 'Проект успешно создан', projectId: this.lastID });
          });
        }
      );
    });
  });
});


// Создание проекта с загрузкой файлов
const uploadProjectFiles = upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'files', maxCount: 15 }]);
app.post('/projects', uploadProjectFiles, (req, res) => {
  const { caseId, userId, title, theme, description } = req.body;
  if (!caseId || !userId || !title)
    return res.status(400).json({ error: 'caseId, userId и title обязательны' });

  let coverPath = null;
  if (req.files.cover && req.files.cover[0])
    coverPath = `/uploads/${req.files.cover[0].filename}`;

  let filesPaths = [];
  if (req.files.files)
    filesPaths = req.files.files.map(file => `/uploads/${file.filename}`);

  const stmt = db.prepare(`
    INSERT INTO Projects (caseId, userId, title, theme, description, cover, files, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(caseId, userId, title, theme || '', description || '', coverPath, JSON.stringify(filesPaths), 'completed', function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка при сохранении проекта' });
    }
    // Обновляем статус кейса
    db.run('UPDATE Cases SET status = ? WHERE id = ?', ['closed', caseId]);
    res.json({ id: this.lastID, message: 'Проект успешно создан' });
  });
});

// Получение проектов с JOIN для получения email пользователя
app.get('/projects', (req, res) => {
  const userId = req.query.userId;
  let sql = `
    SELECT Projects.*, Users.email as userEmail
    FROM Projects
    LEFT JOIN Users ON Projects.userId = Users.id
  `;
  const params = [];
  if (userId) {
    sql += ' WHERE Projects.userId = ?';
    params.push(userId);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка при получении проектов' });
    rows.forEach(row => {
      row.files = row.files ? JSON.parse(row.files) : [];
    });
    res.json(rows);
  });
});

// Получение детальной информации о проекте по id
app.get('/projects/:id', (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT Projects.*, Users.email as userEmail
    FROM Projects
    LEFT JOIN Users ON Projects.userId = Users.id
    WHERE Projects.id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Ошибка при получении проекта' });
    }
    if (!row) return res.status(404).json({ error: 'Проект не найден' });
    row.files = row.files ? JSON.parse(row.files) : [];
    res.json(row);
  });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Глобальная ошибка сервера:', err.stack);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
