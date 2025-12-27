import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, BookOpen, Calendar, CheckSquare,
  MessageSquare, Users, LogOut, Menu, X, Bell,
  AlertCircle, CheckCircle,
} from "lucide-react";

// --- SUB-COMPONENTS ---
// All the components for different dashboard sections are imported here.
import DashboardHome from "./DashboardHome";
import Assignments from "./Assignments";
import Timetable from "./Timetable";
// The Attendance component is correctly imported here
import Attendance from "./Attendance";
import Messages from "./Messages";
import Meetings from "./Meetings";
import Notifications from "./Notifications";

// --- TOAST NOTIFICATION COMPONENT ---
// This is a helper component for showing pop-up messages.
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

// --- MAIN DASHBOARD COMPONENT ---
const StudentDashboard = () => {
  // Authentication and data from context
  const { user, logout, classesList, studentsList, teachersList } = useAuth();
  
  // State for managing the UI
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Function to display toast messages
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Memoize the student's classes to avoid unnecessary recalculations
  const myClasses = useMemo(() => {
    if (!user || !user.details || !classesList) return [];
    return classesList.filter(
      (c) =>
        c.ClassID === user.details.ClassID ||
        (user.details.classes && user.details.classes[c.ClassID])
    );
  }, [classesList, user]);

  // Function to render the correct component based on the active tab
  const renderContent = () => {
    // Props that are common to most child components
    const commonProps = {
      user,
      myClasses,
      studentsList,
      teachersList,
      showToast,
    };

    switch (activeTab) {
      case "dashboard":
        return <DashboardHome {...commonProps} />;
      case "assignments":
        return <Assignments {...commonProps} />;
      case "timetable":
        return <Timetable myClasses={myClasses} />;
      case "attendance":
        // The Attendance component is used here
        return <Attendance {...commonProps} />;
      case "messages":
        return <Messages {...commonProps} />;
      case "meetings":
        return <Meetings {...commonProps} />;
      default:
        return <div>Select a tab</div>;
    }
  };

  // Configuration for the sidebar menu
  const menu = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignments", label: "Assignments", icon: BookOpen },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "attendance", label: "Attendance", icon: CheckSquare },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "meetings", label: "Meetings", icon: Users },
  ];

  return (
    <div className="dashboard-layout">
      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          {!collapsed && <span>CampusERP</span>}
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
                Student
              </span>
              <strong style={{ fontSize: "0.9rem" }}>
                {user.details.StudentName}
              </strong>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
          <Notifications
            user={user}
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

export default StudentDashboard;