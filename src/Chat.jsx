import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Send, Hash } from 'lucide-react';

export default function Chat({ teamMembers, currentUserEmail, selectedChat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getMemberInfo = (email) => {
    const member = teamMembers.find(m => m.email.toLowerCase() === email?.toLowerCase());
    if (member) return member;
    const fallbackName = email ? email.split('@')[0] : 'Unknown';
    return { 
      initials: fallbackName.substring(0, 2).toUpperCase(), 
      name: fallbackName, 
      color: '#6366f1',
      email: email
    };
  };

  const fetchMessages = async () => {
    if (!selectedChat || !currentUserEmail) return;
    setLoading(true);
    
    try {
      let query = supabase.from('messages').select('*');
      
      if (selectedChat.type === 'group') {
        // Group Chat fetching
        query = query.eq('group_id', selectedChat.id);
      } else {
        // Direct Message fetching
        query = query.or(`and(user_email.eq.${currentUserEmail},recipient_email.eq.${selectedChat.email}),and(user_email.eq.${selectedChat.email},recipient_email.eq.${currentUserEmail})`)
                     .is('group_id', null);
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
        
      if (error) throw error;
      setMessages(data || []);
      setLoading(false);
      scrollToBottom();
    } catch (err) {
      console.error("Error fetching messages:", err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    } else {
      setMessages([]);
    }

    // Subscribe to realtime inserts for messages
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        
        if (selectedChat) {
          let isRelevant = false;
          if (selectedChat.type === 'group') {
            isRelevant = msg.group_id === selectedChat.id;
          } else {
            isRelevant = 
              !msg.group_id && 
              ((msg.user_email === currentUserEmail && msg.recipient_email === selectedChat.email) ||
               (msg.user_email === selectedChat.email && msg.recipient_email === currentUserEmail));
          }
          
          if (isRelevant) {
            setMessages(current => [...current, msg]);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, currentUserEmail]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    
    const msg = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData = {
        content: msg, 
        user_id: user.id,
        user_email: user.email,
      };

      if (selectedChat.type === 'group') {
        insertData.group_id = selectedChat.id;
      } else {
        insertData.recipient_email = selectedChat.email;
      }

      const { error } = await supabase
        .from('messages')
        .insert([insertData]);
        
      if (error) {
        console.error("Error sending message:", error.message);
        setNewMessage(msg); // restore on error
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="dm-chat-area" style={{height: '100%', flex: 1}}>
      {!selectedChat ? (
        <div className="chat-empty">Select a group or team member from the sidebar to start chatting!</div>
      ) : loading ? (
        <div style={{padding: 20, color: 'var(--text-secondary)'}}>Loading conversation...</div>
      ) : (
        <>
          <div className="dm-chat-header">
            {selectedChat.type === 'group' ? (
                <>
                  <div className="chat-avatar" style={{backgroundColor: 'var(--accent)', marginTop: 0}}>
                  <Hash size={16} />
                </div>
                <div>
                  <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>{selectedChat.name}</div>
                  <div style={{fontSize: 12, color: 'var(--text-tertiary)'}}>Group Chat</div>
                </div>
                </>
            ) : (
              <>
                <div className="chat-avatar" style={{backgroundColor: selectedChat.color, marginTop: 0}}>
                  {selectedChat.initials}
                </div>
                <div>
                  <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>{selectedChat.name}</div>
                  <div style={{fontSize: 12, color: 'var(--text-tertiary)'}}>{selectedChat.email}</div>
                </div>
              </>
            )}
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet. Say hi!</div>
            )}
            
            {messages.map((msg, index) => {
              const member = getMemberInfo(msg.user_email);
              const isMe = msg.user_email?.toLowerCase() === currentUserEmail?.toLowerCase();
              
              return (
                <div key={msg.id || index} className={`chat-message-wrapper ${isMe ? 'is-me' : ''}`}>
                  {!isMe && (
                    <div className="chat-avatar" style={{backgroundColor: member.color, marginTop: 'auto'}} title={member.name}>
                      {member.initials}
                    </div>
                  )}
                  
                  <div className="chat-message">
                    {!isMe && (
                      <span className="chat-sender">{member.name}</span>
                    )}
                    <div className="chat-bubble">{msg.content}</div>
                    <span className="chat-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendMessage} className="chat-input-area">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedChat.type === 'group' ? `Message ${selectedChat.name}...` : `Message ${selectedChat.name}...`}
              autoFocus
            />
            <button type="submit" disabled={!newMessage.trim()} className="btn-icon send-btn">
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
