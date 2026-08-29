import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
let db;

export async function initDb() {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Create tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT,
      assignee TEXT
    );
  `);

  // Create team_members table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT NOT NULL,
      color TEXT NOT NULL,
      email TEXT NOT NULL
    );
  `);

  // Seed team_members data if empty
  const teamCount = await db.get('SELECT COUNT(*) as count FROM team_members');
  if (teamCount.count === 0) {
    const seedTeam = [
      { id: 'AL', name: 'Alex Lee', initials: 'AL', role: 'Engineering Manager', color: '#6366f1', email: 'alex@huly.app' },
      { id: 'SJ', name: 'Sarah Jenkins', initials: 'SJ', role: 'Frontend Developer', color: '#14b8a6', email: 'sarah@huly.app' },
      { id: 'DP', name: 'David Park', initials: 'DP', role: 'Backend Developer', color: '#f59e0b', email: 'david@huly.app' },
      { id: 'MG', name: 'Maria Garcia', initials: 'MG', role: 'UI/UX Designer', color: '#ec4899', email: 'maria@huly.app' },
      { id: 'TC', name: 'Tom Chen', initials: 'TC', role: 'DevOps Engineer', color: '#3b82f6', email: 'tom@huly.app' },
      { id: 'RW', name: 'Rachel Wong', initials: 'RW', role: 'Product Manager', color: '#8b5cf6', email: 'rachel@huly.app' },
      { id: 'JB', name: 'James Brown', initials: 'JB', role: 'QA Engineer', color: '#ef4444', email: 'james@huly.app' },
      { id: 'KN', name: 'Kate Nguyen', initials: 'KN', role: 'Marketing Lead', color: '#10b981', email: 'kate@huly.app' }
    ];

    for (const member of seedTeam) {
      await db.run(
        'INSERT INTO team_members (id, name, initials, role, color, email) VALUES (?, ?, ?, ?, ?, ?)',
        [member.id, member.name, member.initials, member.role, member.color, member.email]
      );
    }
    console.log('Database seeded with initial team members.');
  }

  // Seed tasks data if empty
  const count = await db.get('SELECT COUNT(*) as count FROM tasks');
  if (count.count === 0) {
    const seedTasks = [
      { id: 'AUTH-01', title: 'Implement OAuth2 with Google & GitHub', status: 'done', priority: 'high', assignee: 'DP' },
      { id: 'AUTH-02', title: 'Add Multi-Factor Authentication (MFA) via SMS/Authenticator App', status: 'review', priority: 'high', assignee: 'DP' },
      { id: 'AUTH-03', title: 'Design user profile and security settings page', status: 'done', priority: 'medium', assignee: 'MG' },
      { id: 'AUTH-04', title: 'Build React components for security settings', status: 'progress', priority: 'medium', assignee: 'SJ' },
      { id: 'AUTH-05', title: 'E2E Testing for complete registration flow', status: 'todo', priority: 'high', assignee: 'JB' },
      { id: 'BILL-01', title: 'Integrate Stripe Webhooks for subscription lifecycle', status: 'progress', priority: 'high', assignee: 'DP' },
      { id: 'BILL-02', title: 'Design pricing table and upgrade flow', status: 'done', priority: 'medium', assignee: 'MG' },
      { id: 'BILL-03', title: 'Implement frontend checkout experience with Stripe Elements', status: 'todo', priority: 'high', assignee: 'SJ' },
      { id: 'BILL-04', title: 'Generate monthly PDF invoices and email receipts', status: 'todo', priority: 'low', assignee: 'AL' },
      { id: 'INFRA-01', title: 'Migrate staging environment to Kubernetes (EKS)', status: 'review', priority: 'high', assignee: 'TC' },
      { id: 'INFRA-02', title: 'Setup Datadog APM tracing for Node.js microservices', status: 'done', priority: 'medium', assignee: 'TC' },
      { id: 'INFRA-03', title: 'Configure auto-scaling groups based on CPU utilization', status: 'todo', priority: 'medium', assignee: 'TC' },
      { id: 'INFRA-04', title: 'Perform load testing with Artillery simulating 10k users', status: 'todo', priority: 'high', assignee: 'JB' },
      { id: 'CORE-01', title: 'Wireframe the V2 Analytics Dashboard', status: 'done', priority: 'high', assignee: 'MG' },
      { id: 'CORE-02', title: 'Build chart components using Recharts (Line, Bar, Pie)', status: 'progress', priority: 'medium', assignee: 'SJ' },
      { id: 'CORE-03', title: 'Create optimized SQL views for daily aggregated metrics', status: 'review', priority: 'high', assignee: 'DP' },
      { id: 'CORE-04', title: 'Implement WebSocket connections for real-time dashboard updates', status: 'todo', priority: 'high', assignee: 'AL' },
      { id: 'MKT-01', title: 'Draft technical blog post: "How we migrated to Vite & React 19"', status: 'progress', priority: 'medium', assignee: 'KN' },
      { id: 'MKT-02', title: 'SEO optimization for landing pages (Meta tags, OpenGraph)', status: 'todo', priority: 'low', assignee: 'SJ' },
      { id: 'MKT-03', title: 'Create email templates for user onboarding sequence', status: 'review', priority: 'medium', assignee: 'MG' },
      { id: 'PROD-01', title: 'Finalize Q3 Roadmap and OKRs with stakeholders', status: 'progress', priority: 'high', assignee: 'RW' },
      { id: 'PROD-02', title: 'Conduct user interviews for feature validation (Cohort A)', status: 'todo', priority: 'medium', assignee: 'RW' },
      { id: 'PROD-03', title: 'Triage user-reported bugs from Intercom', status: 'todo', priority: 'low', assignee: 'AL' }
    ];

    for (const task of seedTasks) {
      await db.run(
        'INSERT INTO tasks (id, title, status, priority, assignee) VALUES (?, ?, ?, ?, ?)',
        [task.id, task.title, task.status, task.priority, task.assignee]
      );
    }
    console.log('Database seeded with initial tasks.');
  }

  return db;
}

export function getDb() {
  return db;
}
