import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Search, Bell, Settings, Plus, Hexagon,
  Inbox, LayoutGrid, CheckSquare, MessageSquare, 
  Users, FolderKanban, MoreHorizontal, ChevronRight,
  Circle, PlayCircle, CheckCircle2, Clock, LogOut, MessageCircle, Hash, X, Check, UserPlus
} from 'lucide-react';
import IssueModal from './IssueModal';
import Login from './Login';
import Chat from './Chat';
import { supabase, adminAuthClient } from './lib/supabase';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [activeSection, setActiveSection] = useState('issues');
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Chat State lifted from Chat.jsx
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembersForGroup, setSelectedMembersForGroup] = useState([]);

  // Invite User State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', password: '', role: 'User' });
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTasks = async () => {
    try {
      const [tasksRes, teamRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('team_members').select('*')
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (teamRes.error) throw teamRes.error;

      setTasks(tasksRes.data || []);
      setTeamMembers(teamRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch data from Supabase:", err);
      setLoading(false);
    }
  };

  const fetchGroups = async (userEmail) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('chat_group_members')
        .select('group_id')
        .eq('user_email', userEmail);
        
      if (memberError) throw memberError;
      
      const groupIds = memberData.map(m => m.group_id);
      
      if (groupIds.length > 0) {
        const { data: groupData, error: groupError } = await supabase
          .from('chat_groups')
          .select('*')
          .in('id', groupIds);
          
        if (groupError) throw groupError;
        setGroups(groupData || []);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error("Error fetching groups:", err.message);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
      fetchGroups(session.user.email);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const memberChannel = supabase.channel('public:chat_group_members')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_members' }, (payload) => {
        if (payload.new.user_email === session.user.email) {
          fetchGroups(session.user.email);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', taskData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to save task to Supabase:", err);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const updatedTasks = tasks.map(t => {
      if (t.id === draggableId) {
        return { ...t, status: destination.droppableId };
      }
      return t;
    });
    setTasks(updatedTasks);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: destination.droppableId })
        .eq('id', draggableId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update status on drag", err);
      fetchTasks();
    }
  };

  const openNewIssue = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditIssue = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const getMemberInfo = (id) => {
    return teamMembers.find(m => m.id === id) || { initials: id, name: id, color: 'var(--accent)' };
  };

  const columns = [
    { id: 'todo', title: 'Todo', icon: <Circle size={14} color="var(--text-tertiary)" />, tasks: tasks.filter(t => t.status === 'todo') },
    { id: 'progress', title: 'In Progress', icon: <PlayCircle size={14} color="#f5a623" />, tasks: tasks.filter(t => t.status === 'progress') },
    { id: 'review', title: 'In Review', icon: <MessageSquare size={14} color="var(--accent)" />, tasks: tasks.filter(t => t.status === 'review') },
    { id: 'done', title: 'Done', icon: <CheckCircle2 size={14} color="#10b981" />, tasks: tasks.filter(t => t.status === 'done'), isFaded: true },
  ];

  if (!session) {
    return <Login />;
  }

  const currentUserEmail = session.user.email;
  const currentUserInitials = currentUserEmail.substring(0, 2).toUpperCase();
  const contacts = teamMembers.filter(m => m.email.toLowerCase() !== currentUserEmail.toLowerCase());

  // Admin Check
  const currentUserProfile = teamMembers.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const isAdmin = currentUserEmail.toLowerCase() === 'ssharvesh616@gmail.com' || currentUserProfile?.role === 'Admin';

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || selectedMembersForGroup.length === 0) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('chat_groups')
        .insert([{ name: newGroupName.trim(), created_by: currentUserEmail }])
        .select()
        .single();

      if (groupError) throw groupError;

      const membersToInsert = [
        { group_id: groupData.id, user_email: currentUserEmail },
        ...selectedMembersForGroup.map(email => ({ group_id: groupData.id, user_email: email }))
      ];

      const { error: membersError } = await supabase
        .from('chat_group_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedMembersForGroup([]);
      
      fetchGroups(currentUserEmail);
      setSelectedChat({ ...groupData, type: 'group' });

    } catch (err) {
      console.error("Error creating group:", err.message);
    }
  };

  const toggleMemberSelection = (email) => {
    if (selectedMembersForGroup.includes(email)) {
      setSelectedMembersForGroup(prev => prev.filter(e => e !== email));
    } else {
      setSelectedMembersForGroup(prev => [...prev, email]);
    }
  };

  return (
    <div className="huly-layout">
      {/* Primary Sidebar (Icons only) */}
      <aside className="sidebar-primary">
        <div className="logo-container">
          <Hexagon size={20} strokeWidth={2.5} />
        </div>
        
        <div className="nav-icons" style={{flex: 1}}>
          <div className="nav-icon active" onClick={() => setActiveSection('issues')}><Inbox size={20} /></div>
          <div className="nav-icon" onClick={() => setActiveSection('team')}><Users size={20} /></div>
          <div className="nav-icon" onClick={() => setActiveSection('chat')}><MessageSquare size={20} /></div>
        </div>

        <div className="nav-icons" style={{marginBottom: 16}}>
          <div className="nav-icon" onClick={handleSignOut} title="Sign Out" style={{cursor: 'pointer'}}>
            <LogOut size={20} color="var(--text-secondary)" />
          </div>
        </div>
        <div className="user-avatar" style={{backgroundColor: '#ec4899'}} title={currentUserEmail}>
          {currentUserInitials}
        </div>
      </aside>

      {/* Secondary Sidebar (Workspace Context) */}
      <aside className="sidebar-secondary">
        <div className="workspace-header">
          <span>{activeSection === 'chat' ? 'Messages' : 'Platform'}</span>
          <ChevronRight size={16} color="var(--text-tertiary)" />
        </div>

        {activeSection === 'chat' ? (
          <div className="section-list">
            <div className="section-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Groups</span>
              <button className="btn-icon-small" onClick={() => setShowCreateGroup(true)} title="Create Group">
                <Plus size={14} />
              </button>
            </div>
            {groups.length === 0 && <div className="list-item" style={{color: 'var(--text-tertiary)', fontSize: 12}}>No groups yet</div>}
            {groups.map(group => (
              <div 
                key={group.id} 
                className={`list-item ${selectedChat?.id === group.id ? 'active' : ''}`}
                onClick={() => setSelectedChat({ ...group, type: 'group' })}
              >
                <Hash size={14} /> {group.name}
              </div>
            ))}

            <div className="section-title" style={{marginTop: '16px'}}>Direct Messages</div>
            {contacts.map(contact => (
              <div 
                key={contact.id} 
                className={`list-item dm-sidebar-item ${selectedChat?.email === contact.email ? 'active' : ''}`}
                onClick={() => setSelectedChat({ ...contact, type: 'dm' })}
              >
                <div className="chat-avatar" style={{backgroundColor: contact.color, width: 16, height: 16, fontSize: 8, marginRight: 8}}>
                  {contact.initials}
                </div>
                {contact.name}
              </div>
            ))}
          </div>
        ) : (
          <div className="section-list">
            <div className="section-title">Your Views</div>
            <div className={`list-item ${activeSection === 'active' ? 'active' : ''}`} onClick={() => setActiveSection('active')}>
              <Clock size={16} /> Active issues
            </div>
            <div className={`list-item ${activeSection === 'backlog' ? 'active' : ''}`} onClick={() => setActiveSection('backlog')}>
              <LayoutGrid size={16} /> Backlog
            </div>
            
            <div className="section-title" style={{marginTop: '16px'}}>Projects</div>
            <div className={`list-item ${activeSection === 'issues' ? 'active' : ''}`} onClick={() => setActiveSection('issues')}>
              <Hexagon size={16} /> Platform Issues
            </div>
            <div className={`list-item ${activeSection === 'team' ? 'active' : ''}`} onClick={() => setActiveSection('team')}>
              <Users size={16} /> Team Directory
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Top Navigation */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Platform</span>
            <ChevronRight size={14} color="var(--text-tertiary)" />
            <span className="current">
              {activeSection === 'team' ? 'Team Directory' : activeSection === 'chat' ? (selectedChat ? selectedChat.name : 'Team Chat') : 'Platform Issues'}
            </span>
          </div>

          <div className="topbar-actions">
            <button className="btn-icon"><Search size={16} /></button>
            <button className="btn-icon"><Bell size={16} /></button>
            <button className="btn-icon"><Settings size={16} /></button>
            {activeSection === 'team' && (
              <button className="btn-primary" style={{backgroundColor: '#10b981'}} onClick={() => setShowInviteModal(true)}>
                <UserPlus size={14} /> Invite User
              </button>
            )}
            {(activeSection !== 'team' && activeSection !== 'chat') && (
              <button className="btn-primary" onClick={openNewIssue}>
                <Plus size={14} /> New Issue
              </button>
            )}
          </div>
        </header>

        {activeSection === 'team' ? (
          <div className="content-area">
            {teamMembers.length === 0 ? (
              <div style={{color: 'var(--text-secondary)', padding: '20px'}}>
                No team members found. Be sure to run the SQL seed script in your Supabase dashboard!
              </div>
            ) : (
              <div className="team-grid">
                {teamMembers.map(member => (
                  <div 
                    className="team-card" 
                    key={member.id}
                    style={{cursor: 'pointer'}}
                    onClick={() => {
                      if (member.email !== currentUserEmail) {
                        setSelectedChat({ ...member, type: 'dm' });
                        setActiveSection('chat');
                      }
                    }}
                  >
                    <div className="team-avatar" style={{ backgroundColor: member.color }}>
                      {member.initials}
                    </div>
                    <div className="team-info">
                      <h3>{member.name}</h3>
                      <p className="team-role">{member.role}</p>
                      <p className="team-email">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeSection === 'chat' ? (
           <Chat 
             teamMembers={teamMembers} 
             currentUserEmail={currentUserEmail} 
             selectedChat={selectedChat}
           />
        ) : (
          <>
            {/* View Header */}
            <div className="view-header">
              <div className="view-title">
                <Hexagon size={24} color="var(--text-primary)" />
                Platform Issues
              </div>
              <div className="view-tabs">
                <div className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>List</div>
                <div className={`tab ${activeTab === 'board' ? 'active' : ''}`} onClick={() => setActiveTab('board')}>Board</div>
                <div className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendar</div>
              </div>
            </div>

            {/* Board Content */}
            <div className="content-area">
              {loading ? (
                <div style={{color: 'var(--text-secondary)', padding: '20px'}}>Connecting to Supabase database...</div>
              ) : activeTab === 'list' ? (
                <div className="list-view">
                  <div className="list-header">
                    <div className="list-col id">ID</div>
                    <div className="list-col title">Title</div>
                    <div className="list-col status">Status</div>
                    <div className="list-col assignee">Assignee</div>
                    <div className="list-col priority">Priority</div>
                  </div>
                  <div className="list-body">
                    {tasks.map(task => {
                      const member = getMemberInfo(task.assignee);
                      return (
                        <div className="list-row" key={task.id} onClick={() => openEditIssue(task)}>
                          <div className="list-col id">{task.id}</div>
                          <div className="list-col title">{task.title}</div>
                          <div className="list-col status">
                            <div className={`status-badge status-${task.status}`}>
                              <div className="status-dot"></div> {task.status.replace('-', ' ')}
                            </div>
                          </div>
                          <div className="list-col assignee">
                            <div className="user-avatar" style={{width: 20, height: 20, fontSize: 9, backgroundColor: member.color}} title={member.name}>
                              {member.initials}
                            </div>
                          </div>
                          <div className="list-col priority" style={{textTransform: 'capitalize'}}>{task.priority}</div>
                        </div>
                      );
                    })}
                    {tasks.length === 0 && <div className="list-row" style={{justifyContent: 'center', color: 'var(--text-secondary)'}}>No tasks found. Run the SQL script!</div>}
                  </div>
                </div>
              ) : activeTab === 'board' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="board">
                    {columns.map(col => (
                      <Droppable droppableId={col.id} key={col.id}>
                        {(provided, snapshot) => (
                          <div 
                            className={`column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{opacity: col.isFaded ? 0.7 : 1}}
                          >
                            <div className="col-header">
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                {col.icon}
                                {col.title} <span className="col-count">{col.tasks.length}</span>
                              </div>
                              <MoreHorizontal size={16} color="var(--text-tertiary)" />
                            </div>
                            
                            {col.tasks.map((task, index) => {
                              const member = getMemberInfo(task.assignee);
                              return (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div 
                                      className={`card status-${task.status} ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => openEditIssue(task)}
                                      style={{
                                        ...provided.draggableProps.style,
                                      }}
                                    >
                                      <div className="card-top">
                                        <span className="card-id">{task.id}</span>
                                        <div className="user-avatar" style={{width: 20, height: 20, fontSize: 9, backgroundColor: member.color}} title={member.name}>
                                          {member.initials}
                                        </div>
                                      </div>
                                      <div className="card-title" style={col.isFaded ? {textDecoration: 'line-through', color: 'var(--text-secondary)'} : {}}>{task.title}</div>
                                      <div className="card-bottom">
                                        <div className="status-badge">
                                          <div className="status-dot"></div> {col.title}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </DragDropContext>
              ) : (
                 <div style={{color: 'var(--text-secondary)', padding: '20px'}}>Calendar view not implemented yet.</div>
              )}
            </div>
          </>
        )}
      </main>

      <IssueModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        editingTask={editingTask}
        teamMembers={teamMembers}
      />
      
      {/* Create Group Modal Overlay */}
      {showCreateGroup && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 400}}>
            <div className="modal-header">
              <h2>Create Group Chat</h2>
              <button className="btn-icon" onClick={() => setShowCreateGroup(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)} 
                  placeholder="e.g. Design Team"
                />
              </div>
              <div className="form-group" style={{marginTop: 16}}>
                <label>Select Members</label>
                <div className="group-members-list">
                  {contacts.map(contact => (
                    <div 
                      key={contact.id} 
                      className="group-member-option"
                      onClick={() => toggleMemberSelection(contact.email)}
                    >
                      <div className="chat-avatar" style={{backgroundColor: contact.color, width: 24, height: 24, fontSize: 10, marginTop: 0}}>
                        {contact.initials}
                      </div>
                      <span style={{flex: 1}}>{contact.name}</span>
                      <div className={`checkbox ${selectedMembersForGroup.includes(contact.email) ? 'checked' : ''}`}>
                        {selectedMembersForGroup.includes(contact.email) && <Check size={12} color="#fff" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateGroup(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembersForGroup.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
