import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, push, onValue, update } from "firebase/database";
// No specific icons needed for the current UI in Messages

const ParentMessages = ({ selectedChildClasses, user, teachersList, showToast, activeTab }) => {
  const [messages, setMessages] = useState({});
  const [selectedTeacherID, setSelectedTeacherID] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef(null);
  
  const parentID = user?.details?.ParentID; // Parent's ID
  const parentName = user?.details?.ParentName;

  useEffect(() => {
    if (!parentID) return;
    const unsub = onValue(ref(db, 'parent_messages'), (s) => setMessages(s.val() || {})); // Separate node for parent messages
    return () => unsub();
  }, [parentID]);

  useEffect(() => {
    if (!selectedTeacherID || activeTab !== 'messages' || !parentID) return;

    const convID = `${parentID}_${selectedTeacherID}`; // Parent-Teacher conversation ID
    const msgs = messages[convID] || {};
    const updates = {};
    let hasUnread = false;

    Object.keys(msgs).forEach(msgKey => {
        const msg = msgs[msgKey];
        if (msg.sender === 'teacher' && !msg.read) {
            updates[`parent_messages/${convID}/${msgKey}/read`] = true; // Mark as read in parent_messages node
            hasUnread = true;
        }
    });

    if (hasUnread) {
        update(ref(db), updates).catch(error => console.error("Error marking messages as read:", error));
    }
  }, [selectedTeacherID, parentID, activeTab, messages]);

  const myTeachers = useMemo(() => {
    if (!teachersList || !selectedChildClasses) return [];
    // Teachers related to the selected child's classes
    const teacherIDs = new Set(selectedChildClasses.map(c => c.TeacherID));
    return teachersList.filter(t => teacherIDs.has(t.TeacherID));
  }, [teachersList, selectedChildClasses]);

  const currentConversation = useMemo(() => {
    if (!selectedTeacherID || !parentID) return [];
    const convID = `${parentID}_${selectedTeacherID}`;
    const msgs = messages[convID] || {};
    return Object.keys(msgs).map(key => ({ ...msgs[key], key })).sort((a,b) => a.timestamp - b.timestamp);
  }, [messages, selectedTeacherID, parentID]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation]);

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedTeacherID || !parentID) return;
    const convID = `${parentID}_${selectedTeacherID}`;
    push(ref(db, `parent_messages/${convID}`), { // Store in parent_messages node
      sender: 'parent',
      senderName: parentName, // Include parent's name
      text: chatMessage,
      timestamp: Date.now(),
      read: false
    });
    setChatMessage("");
  };

  const selectedTeacherInfo = teachersList.find(t => t.TeacherID === selectedTeacherID);

  return (
    <div className="content-card" style={{padding:0, overflow:'hidden', height:'650px', display:'flex'}}>
      <div style={{width:280, borderRight:'1px solid #e2e8f0', background:'#ffffff', overflowY:'auto'}}>
        <div style={{padding:15, borderBottom:'1px solid #e2e8f0', fontWeight:'bold'}}>Teachers</div>
        {myTeachers.length === 0 ? (
            <p style={{padding: 15, color: '#94a3b8'}}>No teachers found for selected child's classes.</p>
        ) : (
            myTeachers.map(t => (
            <div key={t.TeacherID} onClick={() => setSelectedTeacherID(t.TeacherID)}
                style={{padding:'12px 15px', cursor:'pointer', background: selectedTeacherID === t.TeacherID ? '#eef2ff' : 'transparent'}}>
                {t.TeacherName}
            </div>
            ))
        )}
      </div>
      <div style={{flex:1, display:'flex', flexDirection:'column'}}>
        {selectedTeacherID ? (
          <>
            <div style={{padding:15, borderBottom:'1px solid #e2e8f0', fontWeight:600}}>
              Chat with {selectedTeacherInfo?.TeacherName}
            </div>
            <div style={{flex:1, padding:20, overflowY:'auto', background:'#f1f5f9'}}>
              {currentConversation.map((msg) => (
                <div key={msg.key} style={{marginBottom:10, textAlign: msg.sender === 'parent' ? 'right':'left'}}>
                  <div style={{background: msg.sender==='parent' ? '#4f46e5':'#e2e8f0', color: msg.sender==='parent' ? 'white':'black', padding:'8px 12px', borderRadius: '10px', display:'inline-block'}}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef}></div>
            </div>
            <div style={{padding:15, borderTop:'1px solid #e2e8f0', background:'#ffffff', display:'flex', gap:10}}>
              <input className="form-control" value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Type your message..." />
              <button className="btn-primary" onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8'}}>Select a teacher to start a conversation.</div>}
      </div>
    </div>
  );
};

export default ParentMessages;