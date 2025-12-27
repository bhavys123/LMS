import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/Login/LoginPage";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import TeacherDashboard from "./pages/Teacher/TeacherDashboard";
import StudentDashboard from "./pages/Student/StudentDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";
import "./App.css";

const AppContent = () => {
  const { user } = useAuth();

  // 1. If not logged in, show Login
  if (!user) {
    return <LoginPage />;
  }

  // 2. Route based on Role (Fixed logic)
  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    case "parent":
      return <ParentDashboard />;
    default:
      return (
        <div style={{ padding: 50, textAlign: "center", color: "red" }}>
          <h2>Error: Role "{user.role}" not recognized.</h2>
          <button 
            onClick={() => window.location.reload()} 
            style={{padding: '10px 20px', marginTop: 20, cursor: 'pointer'}}
          >
            Go Back / Logout
          </button>
        </div>
      );
  }
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}