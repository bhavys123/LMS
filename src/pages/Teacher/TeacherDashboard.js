import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { 
  LayoutDashboard, BookOpen, Calendar, CheckSquare, 
  MessageSquare, Users, LogOut, Menu, X, Bell, 
  AlertCircle, CheckCircle 
} from "lucide-react";

// --- SUB-COMPONENTS ---
import DashboardHome from "./DashboardHome";
import Assignments from "./Assignments";
import Timetable from "./Timetable";
import Attendance from "./Attendance";
import Messages from "./Messages";
import Meetings from "./Meetings";
import Notifications from "./Notifications"; // Newly created component

// --- TOAST NOTIFICATION COMPONENT ---
const Toast = ({ message, type, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000,
    background: type === 'error' ? '#ef4444' : (type === 'info' ? '#3b82f6' : '#10b981'),
    color: 'white', padding: '12px 20px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', gap: '10px', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'slideIn 0.3s ease', maxWidth: '400px'
  }}>
    {type === 'error' ? <AlertCircle size={18} /> : (type === 'info' ? <Bell size={18}/> : <CheckCircle size={18} />)}
    <span style={{fontWeight: 500, fontSize: '14px', lineHeight: '1.4'}}>{message}</span>
    <button onClick={onClose} style={{background:'none', border:'none', color:'white', cursor:'pointer', opacity: 0.8}}><X size={16}/></button>
  </div>
);

const TeacherDashboard = () => {
  const { user, logout, classesList, studentsList } = useAuth();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // Toggle for notification dropdown
  const [toast, setToast] = useState(null);
  
  // Badge Counters
  const [notifications, setNotifications] = useState({ messages: 0, meetings: 0 });

  // --- HELPER: SHOW TOAST ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // --- MEMOIZED DATA ---
  // Filter classes specific to this teacher once, pass down to children
  const myClasses = useMemo(() => (classesList || []).filter(c => 
      String(c.TeacherID || "").trim().toLowerCase() === String(user?.details?.TeacherID || "").trim().toLowerCase() 
      && !c.disabled
  ), [classesList, user]);

  // --- GLOBAL LISTENERS (For Badges) ---
  useEffect(() => {
    if(!user?.details?.TeacherID) return;

    // 1. Listen for Unread Messages
    const unsubMsg = onValue(ref(db, 'messages'), (s) => {
        const data = s.val() || {};
        let unread = 0;
        Object.keys(data).forEach(convID => {
            if(convID.includes(user.details.TeacherID)) {
                Object.values(data[convID]).forEach(m => {
                    if(m.sender === 'parent' && !m.read) unread++;
                });
            }
        });
        setNotifications(prev => ({...prev, messages: unread}));
    });

    // 2. Listen for Pending Meetings
    const unsubMeet = onValue(ref(db, 'meetings'), (s) => {
        const data = s.val() || {};
        const pending = Object.values(data).filter(m => 
            m.teacherID === user.details.TeacherID && m.status === 'REQUESTED'
        ).length;
        setNotifications(prev => ({...prev, meetings: pending}));
    });

    return () => { unsubMsg(); unsubMeet(); };
  }, [user]);

  // --- MENU CONFIGURATION ---
  const menu = [
      {id:'dashboard', label:'Dashboard', icon: LayoutDashboard},
      {id:'assignments', label:'Assignments', icon: BookOpen},
      {id:'timetable', label:'Timetable', icon: Calendar},
      {id:'attendance', label:'Attendance', icon: CheckSquare},
      {id:'messages', label:'Messages', icon: MessageSquare, badge: notifications.messages},
      {id:'meetings', label:'Meetings', icon: Users, badge: notifications.meetings},
  ];

  // --- RENDER CONTENT SWITCHER ---
  const renderContent = () => {
    const commonProps = { user, myClasses, studentsList, showToast };
    
    switch(activeTab) {
        case 'dashboard': return <DashboardHome myClasses={myClasses} notifications={notifications} />;
        case 'assignments': return <Assignments {...commonProps} />;
        case 'timetable': return <Timetable myClasses={myClasses} />;
        case 'attendance': return <Attendance {...commonProps} />;
        case 'messages': return <Messages {...commonProps} />;
        case 'meetings': return <Meetings {...commonProps} />;
        default: return null;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
           {!collapsed && <span>CampusERP</span>}
           <button onClick={()=>setCollapsed(!collapsed)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}>{collapsed?<Menu size={20}/>:<X size={20}/>}</button>
        </div>
        <div style={{padding:10}}>
            {menu.map(i => (
                <div key={i.id} className={`nav-item ${activeTab===i.id?'active':''}`} onClick={()=>setActiveTab(i.id)}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <i.icon size={20} /> {!collapsed && <span>{i.label}</span>}
                    </div>
                    {i.badge > 0 && !collapsed && <span style={{background:'#ef4444', color:'white', borderRadius:'10px', padding:'2px 6px', fontSize:'10px', fontWeight:'bold', minWidth:'20px', textAlign:'center'}}>{i.badge}</span>}
                </div>
            ))}
        </div>
        <div className="sidebar-footer" style={{marginTop:'auto', padding:20}}>
            <div className="nav-item" onClick={logout} style={{color:'#f87171'}}><LogOut size={20}/> {!collapsed && <span>Logout</span>}</div>
        </div>
      </aside>
      
      {/* --- MAIN CONTENT --- */}
      <main className="main-content" style={{position:'relative'}}>
        
        {/* TOP BAR */}
        <div className="top-bar">
           <h3 style={{fontWeight:700, fontSize:'1.2rem'}}>{menu.find(i=>i.id===activeTab)?.label}</h3>
           
           <div style={{display:'flex', alignItems:'center', gap:20}}>
               {/* Bell Icon with Red Dot */}
               <div 
                  style={{position:'relative', cursor: 'pointer', display:'flex', alignItems:'center'}} 
                  onClick={() => setShowNotifications(!showNotifications)}
               >
                   <Bell size={20} color="#64748b"/>
                   {(notifications.messages + notifications.meetings) > 0 && 
                       <span style={{
                           position:'absolute', top:-6, right:-6, width:10, height:10, 
                           background:'#ef4444', borderRadius:'50%', border:'2px solid white'
                       }}></span>
                   }
               </div>

               {/* Profile Info */}
               <div style={{display:'flex', alignItems:'center', gap:10}}>
                   <span className="badge badge-info" style={{fontSize:'0.75rem'}}>Teacher</span>
                   <strong style={{fontSize:'0.9rem'}}>{user.details.TeacherName}</strong>
               </div>
           </div>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
            <Notifications 
                user={user} 
                onClose={() => setShowNotifications(false)} 
                setActiveTab={setActiveTab} 
            />
        )}

        {/* PAGE CONTENT */}
        <div className="page-area">{renderContent()}</div>
      </main>

      {/* TOAST POPUP */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
};

export default TeacherDashboard;