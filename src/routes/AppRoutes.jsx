// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import AdminDashboard from "../pages/Admin/AdminDashboard";
import TeacherDashboard from "../pages/Teacher/TeacherDashboard";
import StudentDashboard from "../pages/Student/StudentDashboard";
import ParentDashboard from "../pages/Parent/ParentDashboard";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If role not allowed, send to their own dashboard
    const fallbackPath =
      user.role === "admin"
        ? "/admin"
        : user.role === "teacher"
        ? "/teacher"
        : user.role === "parent"
        ? "/parent"
        : "/student";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <PrivateRoute allowedRoles={["teacher", "admin"]}>
            <TeacherDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/student"
        element={
          <PrivateRoute allowedRoles={["student", "admin"]}>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/parent"
        element={
          <PrivateRoute allowedRoles={["parent", "admin"]}>
            <ParentDashboard />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
