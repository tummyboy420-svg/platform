import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const team = [
  { id: 'AL', name: 'Alex Lee', initials: 'AL', role: 'Engineering Manager', color: '#6366f1', email: 'alex@huly.app' },
  { id: 'SJ', name: 'Sarah Jenkins', initials: 'SJ', role: 'Frontend Developer', color: '#14b8a6', email: 'sarah@huly.app' },
  { id: 'DP', name: 'David Park', initials: 'DP', role: 'Backend Developer', color: '#f59e0b', email: 'david@huly.app' },
  { id: 'MG', name: 'Maria Garcia', initials: 'MG', role: 'UI/UX Designer', color: '#ec4899', email: 'maria@huly.app' },
  { id: 'TC', name: 'Tom Chen', initials: 'TC', role: 'DevOps Engineer', color: '#3b82f6', email: 'tom@huly.app' },
  { id: 'RW', name: 'Rachel Wong', initials: 'RW', role: 'Product Manager', color: '#8b5cf6', email: 'rachel@huly.app' },
  { id: 'JB', name: 'James Brown', initials: 'JB', role: 'QA Engineer', color: '#ef4444', email: 'james@huly.app' },
  { id: 'KN', name: 'Kate Nguyen', initials: 'KN', role: 'Marketing Lead', color: '#10b981', email: 'kate@huly.app' }
];

const tasks = [
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

async function seed() {
  console.log("Seeding team members...");
  for (const member of team) {
    const { error } = await supabase.from('team_members').upsert([member]);
    if (error) {
      console.error(`Error inserting ${member.id}:`, error.message);
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        console.error("\n❌ CRITICAL: The 'team_members' table does not exist in Supabase! You must create the tables using the SQL script first.");
        process.exit(1);
      }
    }
  }

  console.log("Seeding tasks...");
  for (const task of tasks) {
    const { error } = await supabase.from('tasks').upsert([task]);
    if (error) console.error(`Error inserting ${task.id}:`, error.message);
  }

  console.log("Seeding complete!");
}

seed();
