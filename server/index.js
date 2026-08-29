import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Initialize database and then start server
initDb().then(() => {
  console.log('Database initialized successfully.');
  
  // Get all tasks
  app.get('/api/tasks', async (req, res) => {
    try {
      const db = getDb();
      const tasks = await db.all('SELECT * FROM tasks');
      res.json(tasks);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get all team members
  app.get('/api/team', async (req, res) => {
    try {
      const db = getDb();
      const team = await db.all('SELECT * FROM team_members');
      res.json(team);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  // Create a new task
  app.post('/api/tasks', async (req, res) => {
    try {
      const { id, title, status, priority, assignee } = req.body;
      const db = getDb();
      await db.run(
        'INSERT INTO tasks (id, title, status, priority, assignee) VALUES (?, ?, ?, ?, ?)',
        [id, title, status, priority, assignee]
      );
      res.status(201).json({ id, title, status, priority, assignee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update a task
  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, status, priority, assignee } = req.body;
      const db = getDb();
      await db.run(
        'UPDATE tasks SET title = ?, status = ?, priority = ?, assignee = ? WHERE id = ?',
        [title, status, priority, assignee, id]
      );
      res.json({ id, title, status, priority, assignee });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete a task
  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      await db.run('DELETE FROM tasks WHERE id = ?', [id]);
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Backend API server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
