import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function IssueModal({ isOpen, onClose, onSave, editingTask, teamMembers = [] }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(teamMembers.length > 0 ? teamMembers[0].id : 'JD');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setStatus(editingTask.status);
      setPriority(editingTask.priority || 'medium');
      setAssignee(editingTask.assignee || (teamMembers.length > 0 ? teamMembers[0].id : 'JD'));
    } else {
      setTitle('');
      setStatus('todo');
      setPriority('medium');
      setAssignee(teamMembers.length > 0 ? teamMembers[0].id : 'JD');
    }
  }, [editingTask, isOpen, teamMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      id: editingTask ? editingTask.id : `HUL-${Math.floor(Math.random() * 1000) + 200}`,
      title,
      status,
      priority,
      assignee,
    };

    onSave(taskData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingTask ? 'Edit Issue' : 'New Issue'}</h2>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Issue title" 
              autoFocus 
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todo">Todo</option>
                <option value="progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assignee</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
                {teamMembers.length === 0 && <option value="JD">Loading...</option>}
              </select>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {editingTask ? 'Save Changes' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
