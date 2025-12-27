import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X
} from "lucide-react";

// --- CORE FIX 1: Import the new, separate management components ---
import DashboardContent from '../Admin/DashboardContent';
import StudentManagement from '../Admin/StudentManagement'; // <-- CORRECTED
import TeacherManagement from '../Admin/TeacherManagement'; // <-- CORRECTED
import ClassManagement from '../Admin/ClassManagement';
import Reports from '../Admin/Reports';
import Settings from '../Admin/Settings';
import Toast from '../../components/ui/Toast';

const AdminDashboard = () => {
  // Data from Auth Context is still used for Dashboard, Reports etc.
  const { user, logout, studentsList, teachersList, classesList } = useAuth();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);

  // --- DATA ---
  const [holidays, setHolidays] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [settings, setSettings] = useState({ editWindow: 24, minAttendance: 75 });

  // --- DATA FETCHING (for non-management components) ---
  useEffect(() => {
    const unsubHolidays = onValue(ref(db, 'holidays'), (s) => setHolidays(s.val() || {}));
    const unsubSettings = onValue(ref(db, 'settings'), (s) => s.exists() && setSettings(s.val()));
    const unsubAtt = onValue(ref(db, 'attendance'), (s) => setAttendanceData(s.val() || {}));
    return () => {
      unsubHolidays();
      unsubSettings();
      unsubAtt();
    };
  }, []);

  // --- ACTIONS ---
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- CORE FIX 2: The handleBulkUpload function is removed from this file. ---
  // This logic is now properly handled inside StudentManagement and TeacherManagement.

  // --- REPORT MEMOIZATION ---
  const reportData = useMemo(() => {
    return studentsList.map(s => {
      let present = 0, total = 0;
      Object.keys(attendanceData).forEach(date => {
          Object.values(attendanceData[date]).forEach(classRecord => {
              if(classRecord[s.StudentID]){
                  total++;
                  if(['Present', 'Late'].includes(classRecord[s.StudentID].status)){
                      present++;
                  }
              }
          });
      });
      const pct = total > 0 ? ((present / total) * 100).toFixed(1) : "100.0";
      return { ...s, total, present, pct, status: parseFloat(pct) < settings.minAttendance ? 'At Risk' : 'Good' };
    });
  }, [studentsList, attendanceData, settings.minAttendance]);

  // --- RENDER LOGIC ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent studentsCount={studentsList.length} teachersCount={teachersList.length} classesCount={classesList.length} reportData={reportData} />;
      
      // --- CORE FIX 3: Render the correct, self-contained components ---
      case 'users': // This ID corresponds to the "Students" sidebar item
        return <StudentManagement showToast={showToast} />;
      
      case 'teachers': // This ID corresponds to the "Teachers" sidebar item
        return <TeacherManagement showToast={showToast} />;

      case 'classes':
        // The ClassManagement component needs data passed as props, so we keep this.
        return <ClassManagement showToast={showToast} />;
      case 'reports':
        return <Reports reportData={reportData} settings={settings} />;
      case 'settings':
        return <Settings initialSettings={settings} holidays={holidays} showToast={showToast} />;
      default:
        return null;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: GraduationCap },
    { id: 'classes', label: 'Timetable', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && <span className="sidebar-brand">CampusERP</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="sidebar-toggle">
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        <div className="sidebar-nav">
          {menuItems.map(item => (
            <div key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
              <span className="nav-icon"><item.icon size={20} /></span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="nav-item logout-btn" onClick={logout}>
            <span className="nav-icon"><LogOut size={20} /></span>
            {!collapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <h2>{menuItems.find(i => i.id === activeTab)?.label}</h2>
          <div className="user-info">
            <span className="badge badge-info">Admin</span>
            <strong>{user?.name || user?.email}</strong>
          </div>
        </div>
        <div className="page-area">
          {renderContent()}
        </div>
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminDashboard;