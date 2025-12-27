import React, { useState, useMemo, useEffect } from "react";
// Corrected AuthContext import path
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, BookOpen, Calendar, CheckSquare,
  MessageSquare, Users, LogOut, Menu, X, Bell,
  AlertCircle, CheckCircle, ChevronDown
} from "lucide-react";

// --- PARENT-SPECIFIC SUB-COMPONENTS ---
// Corrected import paths based on ParentDashboard.jsx being in src/pages/Parent/
// and sub-components being in src/components/dashboard/parent/
import ParentDashboardHome from "./ParentDashboardHome";
import ParentAssignments from "./ParentAssignments";
import ParentTimetable from "./ParentTimetable";
import ParentAttendance from "./ParentAttendance";
import ParentMessages from "./ParentMessages";
import ParentMeetings from "./ParentMeetings";
// Corrected Notifications import path
import Notifications from "./Notifications"; 

// --- TOAST NOTIFICATION COMPONENT (Reusable) ---
const Toast = ({ message, type, onClose }) => (
  <div
    style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: 2000,
      background:
        type === "error" ? "#ef4444" : type === "info" ? "#3b82f6" : "#10b981",
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      animation: "slideIn 0.3s ease",
      maxWidth: "400px",
    }}
  >
    {type === "error" ? (
      <AlertCircle size={18} />
    ) : type === "info" ? (
      <Bell size={18} />
    ) : (
      <CheckCircle size={18} />
    )}
    <span style={{ fontWeight: 500, fontSize: "14px", lineHeight: "1.4" }}>
      {message}
    </span>
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        color: "white",
        cursor: "pointer",
        opacity: 0.8,
      }}
    >
      <X size={16} />
    </button>
  </div>
);

// --- MAIN PARENT DASHBOARD COMPONENT ---
const ParentDashboard = () => {
  const { user, logout, classesList, studentsList, teachersList } = useAuth();
  
  // All Hooks MUST be called unconditionally at the top level.
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Initialize children and selectedChild states with defaults, then update in useEffect
  // Use optional chaining for initial state if `user` might be undefined
  const [children, setChildren] = useState(user?.details?.Children || []);
  const [selectedChildId, setSelectedChildId] = useState(user?.details?.Children?.[0]?.StudentID || null);
  const [selectedChildName, setSelectedChildName] = useState(user?.details?.Children?.[0]?.StudentName || null);

  // Effect to update children and initial selected child once user data is loaded
  // This useEffect will re-run if 'user' object changes (e.g., from null to loaded user data)
  useEffect(() => {
    if (user?.details?.Children && children.length !== user.details.Children.length) {
      setChildren(user.details.Children);
      // If no child is currently selected or the first child changed, select the first one
      if (user.details.Children.length > 0 && (!selectedChildId || selectedChildId !== user.details.Children[0].StudentID)) {
        setSelectedChildId(user.details.Children[0].StudentID);
        setSelectedChildName(user.details.Children[0].StudentName);
      }
    }
  }, [user, children.length, selectedChildId]); // Add children.length to deps for re-evaluation if children array changes

  // useMemo must also be called unconditionally
  const selectedChildClasses = useMemo(() => {
    // Only calculate if essential data for selection is available
    if (!selectedChildId || !classesList || children.length === 0) {
        return [];
    }
    
    const currentChild = children.find(c => c.StudentID === selectedChildId);
    if (!currentChild) {
        return [];
    }

    const childClassIDs = new Set();
    if (currentChild.ClassID) { 
        childClassIDs.add(currentChild.ClassID);
    } 
    else if (currentChild.classes) { 
        Object.keys(currentChild.classes).forEach(id => childClassIDs.add(id));
    }
    
    return classesList.filter(c => childClassIDs.has(c.ClassID));
  }, [classesList, selectedChildId, children]); // Ensure all dependencies are correct


  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChildChange = (event) => {
    const newChildId = event.target.value;
    const child = children.find(c => c.StudentID === newChildId);
    if (child) {
      setSelectedChildId(newChildId);
      setSelectedChildName(child.StudentName);
      setActiveTab("dashboard"); 
    }
  };

  const renderContent = () => {
    // This is the commonProps object that is passed to child components
    const commonProps = {
      user, 
      selectedChildId,
      selectedChildName,
      selectedChildClasses, 
      studentsList,
      teachersList,
      showToast,
    };

    switch (activeTab) {
      case "dashboard":
        return <ParentDashboardHome {...commonProps} />;
      case "assignments":
        return <ParentAssignments {...commonProps} />;
      case "timetable":
        return <ParentTimetable myClasses={selectedChildClasses} />; 
      case "attendance":
        return <ParentAttendance {...commonProps} />; 
      case "messages":
        return <ParentMessages {...commonProps} activeTab={activeTab} />; 
      case "meetings":
        return <ParentMeetings {...commonProps} />;
      default:
        return <div>Select a tab</div>;
    }
  };

  const menu = [
    { id: "dashboard", label: "Child Overview", icon: LayoutDashboard },
    { id: "assignments", label: "Child's Assignments", icon: BookOpen },
    { id: "timetable", label: "Child's Timetable", icon: Calendar },
    { id: "attendance", label: "Child's Attendance", icon: CheckSquare },
    { id: "messages", label: "Messages", icon: MessageSquare }, 
    { id: "meetings", label: "Meetings", icon: Users }, 
  ];

  // Use optional chaining and provide a fallback ID
  const parentID = user?.details?.ParentID || user?.uid || 'guest'; 
  const parentName = user?.details?.ParentName || 'Guest Parent'; // Fallback name

  return (
    <div className="dashboard-layout">
      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          {!collapsed && <span>Parent Portal</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        <div style={{ padding: 10 }}>
          {menu.map((i) => (
            <div
              key={i.id}
              className={`nav-item ${activeTab === i.id ? "active" : ""}`}
              onClick={() => setActiveTab(i.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <i.icon size={20} /> {!collapsed && <span>{i.label}</span>}
              </div>
            </div>
          ))}
        </div>
        <div
          className="sidebar-footer"
          style={{ marginTop: "auto", padding: 20 }}
        >
          <div
            className="nav-item"
            onClick={logout}
            style={{ color: "#f87171" }}
          >
            <LogOut size={20} /> {!collapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="main-content">
        {/* TOP BAR */}
        <div className="top-bar">
          <h3 style={{ fontWeight: 700, fontSize: "1.2rem" }}>
            {menu.find((i) => i.id === activeTab)?.label}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Child Selector Dropdown */}
            {children.length > 0 && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, background: '#e0e7ff', borderRadius: '6px', padding: '5px 10px' }}>
                <select
                  value={selectedChildId || ''} 
                  onChange={handleChildChange}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#4f46e5',
                    paddingRight: '20px', 
                    appearance: 'none', 
                    cursor: 'pointer',
                  }}
                >
                  {/* Optional: Add a placeholder option if no child is selected */}
                  {!selectedChildId && <option value="" disabled>Select Child</option>}
                  {children.map(child => (
                    <option key={child.StudentID} value={child.StudentID}>
                      {child.StudentName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} color="#4f46e5" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
              </div>
            )}

            <div
              style={{
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={20} color="#64748b" />
              {notificationCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 10,
                    height: 10,
                    background: "#ef4444",
                    borderRadius: "50%",
                    border: "2px solid white",
                  }}
                ></span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                Parent
              </span>
              <strong style={{ fontSize: "0.9rem" }}>
                {parentName} {/* Use the safely derived parentName */}
              </strong>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
          <Notifications
            user={{ ...user, details: { ...user.details, StudentID: parentID } }} 
            onClose={() => setShowNotifications(false)}
            setActiveTab={setActiveTab}
            setNotificationCount={setNotificationCount}
          />
        )}

        {/* PAGE CONTENT */}
        <div className="page-area">{renderContent()}</div>
      </main>

      {/* TOAST POPUP */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ParentDashboard;