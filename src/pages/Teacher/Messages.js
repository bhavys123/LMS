import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, push, onValue, remove, update } from "firebase/database"; 
import { Megaphone, X, Trash2, User } from "lucide-react";

const Messages = ({ myClasses, user, studentsList, showToast, activeTab }) => {
  const [messages, setMessages] = useState({});
  const [selectedRecipientID, setSelectedRecipientID] = useState(null); 
  const [selectedRecipientType, setSelectedRecipientType] = useState('parent'); 
  const [chatMessage, setChatMessage] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastClass, setBroadcastClass] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const chatEndRef = useRef(null);
  
  const teacherID = user?.details?.TeacherID;

  // 1. Fetch all messages
  useEffect(() => {
    if (!teacherID) return; 
    // This is the single source of truth for messages
    const unsub = onValue(ref(db, 'messages'), (s) => setMessages(s.val() || {}));
    return () => unsub();
  }, [teacherID]);

  // 2. Mark messages as read when a chat is selected
  useEffect(() => {
    // Only proceed if a parent chat is selected and the Messages tab is active
    if (!selectedRecipientID || activeTab !== 'messages' || !teacherID || selectedRecipientType !== 'parent') return;

    const convID = `${selectedRecipientID}_${teacherID}`;
    const msgs = messages[convID] || {};
    const updates = {};

    let hasUnread = false; // Flag to check if an update is necessary

    Object.keys(msgs).forEach(msgKey => {
        const msg = msgs[msgKey];
        // Only mark unread messages SENT BY THE PARENT as read by the teacher
        if (msg.sender === 'parent' && !msg.read) { 
            updates[`messages/${convID}/${msgKey}/read`] = true;
            hasUnread = true;
        }
    });

    // CRITICAL: Only update the database if there are unread messages to mark.
    // The database update will trigger the onValue listener (in step 1), 
    // which updates 'messages' state, which re-runs 'myParents' memo, 
    // which removes the unread count.
    if (hasUnread) {
        // Use a timeout to ensure the UI has finished rendering the chat before the update
        const timeoutId = setTimeout(() => {
             update(ref(db), updates).catch(error => console.error("Error marking messages as read:", error));
        }, 100); 
        
        return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecipientID, teacherID, activeTab, selectedRecipientType, messages]);
  // NOTE: 'messages' is included as a dependency to run the effect when new messages arrive.
  // The 'hasUnread' check prevents an infinite loop.

  // Combined Parent and Student List Memoization (Calculates unread count)
  const parentAndStudentRecipients = useMemo(() => {
      if (!studentsList || !myClasses || !teacherID) return { parents: [], students: [] };
      
      const teacherClassIDs = myClasses.map(cls => cls.ClassID);
      const studentsInTeacherClasses = studentsList.filter(s => 
          teacherClassIDs.includes(s.ClassID) || (s.classes && Object.keys(s.classes).some(classId => teacherClassIDs.includes(classId)))
      );
      
      // PARENTS LIST
      const parents = studentsInTeacherClasses.map(s => {
          const convID = `${s.StudentID}_${teacherID}`;
          const msgs = messages[convID] || {};
          // The count relies on the 'messages' state which is updated by the onValue listener
          const unreadCount = Object.values(msgs).filter(m => m.sender === 'parent' && !m.read).length; 
          
          return { 
              id: s.StudentID, 
              name: `${s.StudentName}'s Parent`, 
              subtext: s.StudentName,
              type: 'parent',
              unreadCount: unreadCount
          };
      }).sort((a, b) => b.unreadCount - a.unreadCount);

      // STUDENTS LIST
      const students = studentsInTeacherClasses.map(s => {
          return {
              id: s.StudentID,
              name: s.StudentName,
              subtext: `Class: ${s.ClassName || s.ClassID}`,
              type: 'student',
              unreadCount: 0 
          };
      }).sort((a, b) => a.name.localeCompare(b.name));

      return { parents, students };
  }, [studentsList, myClasses, messages, teacherID]); // Dependency on 'messages' is key!

  // Conversation data
  const currentConversation = useMemo(() => {
      if (!selectedRecipientID || !teacherID) return [];
      const convID = `${selectedRecipientID}_${teacherID}`; 
      const msgs = messages[convID] || {};
      return Object.keys(msgs).map(key => ({ ...msgs[key], key })).sort((a,b) => a.timestamp - b.timestamp);
  }, [messages, selectedRecipientID, teacherID]);

  // Scroll to bottom
  useEffect(() => { 
      if(chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); 
  }, [currentConversation]); 

  // Function to handle selecting a recipient (Parent or Student)
  const handleSelectRecipient = (id, type) => {
    // If selecting the same chat, do nothing to avoid unnecessary mark-as-read updates
    if (selectedRecipientID === id && selectedRecipientType === type) return; 
    
    setSelectedRecipientID(id);
    setSelectedRecipientType(type);
  };

  const handleSendMessage = () => {
      if (!chatMessage.trim() || !selectedRecipientID || !teacherID) return;
      
      const convID = `${selectedRecipientID}_${teacherID}`;
      
      push(ref(db, `messages/${convID}`), { 
        sender: 'teacher', 
        text: chatMessage, 
        timestamp: Date.now(), 
        read: false // This 'read' flag is for the parent/student on the other side
      });
      setChatMessage("");
  };

  const handleDeleteMessage = (msgKey) => {
      if (!selectedRecipientID || !msgKey || !teacherID || !window.confirm("Are you sure you want to delete this message?")) return;
      
      const convID = `${selectedRecipientID}_${teacherID}`;
      remove(ref(db, `messages/${convID}/${msgKey}`))
          .then(() => showToast("Message deleted successfully"))
          .catch(error => showToast(`Failed to delete message: ${error.message}`, "error"));
  };

  const handleBroadcastSend = () => {
      if(!broadcastClass || !broadcastMsg.trim() || !teacherID) return showToast("Select Class & Enter Message", "error");
      
      const studentsInClass = studentsList.filter(s => s.ClassID === broadcastClass || (s.classes && s.classes[broadcastClass]));
      let count = 0;
      const updates = {}; 

      studentsInClass.forEach(s => {
          const convID = `${s.StudentID}_${teacherID}`;
          const newMsgRef = push(ref(db, `messages/${convID}`)); 
          updates[`messages/${convID}/${newMsgRef.key}`] = { 
              sender: 'teacher', 
              text: `📢 CLASS ANNOUNCEMENT: ${broadcastMsg}`, 
              timestamp: Date.now(), 
              read: false 
          };
          count++;
      });

      if (Object.keys(updates).length > 0) {
          update(ref(db), updates)
              .then(() => {
                  showToast(`Broadcast sent to ${count} recipient(s)`);
                  setBroadcastMsg(""); 
                  setShowBroadcast(false);
              })
              .catch(error => showToast(`Broadcast failed: ${error.message}`, "error"));
      } else {
        showToast("No students found in the selected class.", "error");
      }
  };
  
  const selectedRecipientInfo = selectedRecipientType === 'parent' 
    ? parentAndStudentRecipients.parents.find(p => p.id === selectedRecipientID)
    : parentAndStudentRecipients.students.find(s => s.id === selectedRecipientID);

  return (
    <>
      {/* Professional Layout Card */}
      <div className="content-card" style={{padding:0, overflow:'hidden', height:'650px', display:'flex', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}>
          
          {/* Conversation List Sidebar */}
          <div style={{width:280, borderRight:'1px solid #e2e8f0', background:'#ffffff', overflowY:'auto', flexShrink: 0}}>
              <div style={{padding:15, borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc'}}>
                  <span style={{fontWeight:'bold', fontSize:'1.1rem', color:'#1f2937'}}>Recipients</span>
                  <button className="btn-primary" title="Send Broadcast" style={{padding:'6px 10px', fontSize:'12px', display:'flex', alignItems:'center', gap:'5px', borderRadius:'8px'}} onClick={()=>setShowBroadcast(true)}>
                      <Megaphone size={14}/> Broadcast
                  </button>
              </div>

              {/* Sidebar Tabs */}
              <div style={{display:'flex', borderBottom:'1px solid #e2e8f0'}}>
                  <button style={{flex:1, padding: '10px 0', border:'none', background: selectedRecipientType === 'parent' ? '#eef2ff' : 'white', cursor:'pointer', fontWeight: selectedRecipientType === 'parent' ? '600' : '400', color: selectedRecipientType === 'parent' ? '#4f46e5' : '#64748b'}}
                          onClick={() => { setSelectedRecipientType('parent'); setSelectedRecipientID(null); }}>Parents</button>
                  <button style={{flex:1, padding: '10px 0', border:'none', background: selectedRecipientType === 'student' ? '#eef2ff' : 'white', cursor:'pointer', fontWeight: selectedRecipientType === 'student' ? '600' : '400', color: selectedRecipientType === 'student' ? '#4f46e5' : '#64748b'}}
                          onClick={() => { setSelectedRecipientType('student'); setSelectedRecipientID(null); }}>Students</button>
              </div>

              {/* List of Recipients */}
              {(selectedRecipientType === 'parent' ? parentAndStudentRecipients.parents : parentAndStudentRecipients.students).map(p => (
                  <div key={p.id} onClick={() => handleSelectRecipient(p.id, p.type)}
                       style={{
                           padding:'12px 15px', cursor:'pointer', 
                           background: selectedRecipientID===p.id?'#eef2ff':'transparent', 
                           borderBottom:'1px solid #f1f5f9',
                           transition:'background 0.2s',
                           display:'flex', justifyContent:'space-between', alignItems:'center'
                       }}
                       onMouseEnter={(e) => e.currentTarget.style.background = selectedRecipientID===p.id?'#eef2ff':'#f8fafc'}
                       onMouseLeave={(e) => e.currentTarget.style.background = selectedRecipientID===p.id?'#eef2ff':'transparent'}
                       >
                      <div>
                          <div style={{fontWeight:600, color:'#1f2937'}}>{p.name}</div>
                          <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'2px'}}>{p.subtext}</div>
                      </div>
                      {p.unreadCount > 0 && (
                          <span style={{background:'#ef4444', color:'white', borderRadius:'50%', width:20, height:20, fontSize:'0.75rem', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:700}}>
                              {p.unreadCount}
                          </span>
                      )}
                  </div>
              ))}
          </div>
          
          {/* Chat Window */}
          <div style={{flex:1, display:'flex', flexDirection:'column'}}>
              {selectedRecipientID ? (
                  <>
                      {/* Chat Header */}
                      <div style={{padding:15, borderBottom:'1px solid #e2e8f0', background:'#ffffff', fontWeight:600, fontSize:'1.1rem', color:'#4f46e5', display:'flex', alignItems:'center', gap:'8px'}}>
                        <User size={20} /> Chat with {selectedRecipientInfo?.name}
                      </div>
                      
                      {/* Messages Area */}
                      <div style={{flex:1, padding:20, overflowY:'auto', background:'#f1f5f9', display:'flex', flexDirection:'column-reverse'}}>
                          <div ref={chatEndRef}></div> 
                          {currentConversation.slice().reverse().map((msg) => ( 
                              <div key={msg.key} style={{marginBottom:15, textAlign: msg.sender==='teacher'?'right':'left'}}>
                                  <div style={{
                                      display:'inline-flex', alignItems:'flex-end', gap: '8px',
                                      flexDirection: msg.sender==='teacher'?'row-reverse':'row'
                                  }}>
                                      {/* Message Bubble */}
                                      <div style={{
                                          padding:'10px 15px', borderRadius: '15px', maxWidth:'70%',
                                          background: msg.sender==='teacher'?'#4f46e5':'white',
                                          color: msg.sender==='teacher'?'white':'#1f2937',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                          textAlign: 'left'
                                      }}>
                                          {msg.text}
                                          <div style={{fontSize:'0.7rem', color: msg.sender==='teacher'?'#d1d5db':'#94a3b8', marginTop:'5px', textAlign:msg.sender==='teacher'?'right':'left'}}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                      </div>

                                      {/* Delete Button (Only for Teacher's own messages) */}
                                      {msg.sender === 'teacher' && (
                                          <Trash2 
                                              size={16} 
                                              color="#94a3b8" 
                                              style={{cursor:'pointer', padding:'2px', flexShrink: 0}}
                                              onClick={() => handleDeleteMessage(msg.key)}
                                              title="Delete Message"
                                          />
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      {/* Message Input Area */}
                      <div style={{padding:15, borderTop:'1px solid #e2e8f0', background:'#ffffff', display:'flex', gap:10}}>
                          <input className="form-control" placeholder="Type message..." value={chatMessage} onChange={e=>setChatMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage(); }}
                                 style={{padding:'10px 15px', borderRadius:'8px', border:'1px solid #cbd5e1', flex:1}} />
                          <button className="btn-primary" onClick={handleSendMessage} style={{padding:'10px 20px', borderRadius:'8px', fontWeight:600}}>Send</button>
                      </div>
                  </>
              ) : <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:'1.1rem'}}>Select a recipient to begin conversation.</div>}
          </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
          <div className="modal-overlay">
              <div className="modal-content" style={{width:450, borderRadius:'12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)'}}>
                  <div className="modal-header">
                      <h3>📢 Broadcast Message</h3>
                      <button onClick={()=>setShowBroadcast(false)} style={{border:'none', background:'none', cursor:'pointer'}}><X size={20} color="#64748b"/></button>
                  </div>
                  <div className="modal-body" style={{padding:'20px 25px'}}>
                      <div className="form-group" style={{marginBottom:'15px'}}>
                          <label className="form-label" style={{fontWeight:600, display:'block', marginBottom:'5px'}}>Select Class</label>
                          <select className="form-control" value={broadcastClass} onChange={e=>setBroadcastClass(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}>
                              <option value="">-- Choose Class --</option>
                              {myClasses.map(c => <option key={c.ClassID} value={c.ClassID}>{c.ClassName}</option>)}
                          </select>
                      </div>
                      <div className="form-group" style={{marginBottom:'20px'}}>
                          <label className="form-label" style={{fontWeight:600, display:'block', marginBottom:'5px'}}>Message</label>
                          <textarea className="form-control" style={{height:100, width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}} value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Announce test, holiday, etc..."/>
                      </div>
                      <button className="btn-primary" style={{width:'100%', padding:'10px', borderRadius:'8px', fontWeight:600}} onClick={handleBroadcastSend}>Send Broadcast</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default Messages;