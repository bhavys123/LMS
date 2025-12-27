import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);       
  const [attendanceData, setAttendanceData] = useState({}); 

  useEffect(() => {
    if (!db) return;

    // 1. Sync Students
    onValue(ref(db, 'students'), (s) => setStudentsList(s.val() ? Object.values(s.val()) : []));
    // 2. Sync Teachers
    onValue(ref(db, 'teachers'), (s) => setTeachersList(s.val() ? Object.values(s.val()) : []));
    // 3. Sync Classes
    onValue(ref(db, 'classes'), (s) => setClassesList(s.val() ? Object.values(s.val()) : []));
    // 4. Sync Attendance
    onValue(ref(db, 'attendance'), (s) => setAttendanceData(s.val() || {}));

  }, []);

  const login = (role, identifier, password) => {
    return new Promise((resolve, reject) => {
      const inputId = identifier.trim().toLowerCase();

      // --- ADMIN ---
      if (role === "admin") {
         if (password === "1234") { setUser({name:"Admin", role:"admin"}); resolve(); }
         else { reject("Invalid Admin Password"); }
         return;
      }

      // --- STUDENT (ID or Email) ---
      if (role === "student") {
        const s = studentsList.find(x => 
          (x.StudentID?.toString() === inputId) || 
          (x.StudentEmail?.toLowerCase() === inputId)
        );
        if (!s) return reject("Student ID or Email not found.");
        if (s.disabled) return reject("Account Disabled.");
        if (password !== "1234") return reject("Incorrect Password.");
        
        setUser({ name: s.StudentName, role: "student", details: s });
        resolve();
        return;
      }

      // --- TEACHER (ID or Email) ---
      if (role === "teacher") {
        const t = teachersList.find(x => 
          (x.TeacherID?.toString() === inputId) || 
          (x.Email?.toLowerCase() === inputId)
        );
        if (!t) return reject("Teacher ID or Email not found.");
        if (t.disabled) return reject("Account Disabled.");
        if (password !== "1234") return reject("Incorrect Password.");

        setUser({ name: t.TeacherName, role: "teacher", details: t });
        resolve();
        return;
      }

      // --- PARENT (Parent Email Only) ---
      if (role === "parent") {
        const child = studentsList.find(x => x.ParentEmail?.toLowerCase() === inputId);
        if (!child) return reject("Parent Email not registered.");
        if (child.disabled) return reject("Child account disabled.");
        if (password !== "1234") return reject("Incorrect Password.");

        setUser({ name: "Parent", role: "parent", child: child });
        resolve();
        return;
      }
    });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, studentsList, teachersList, classesList, attendanceData }}>
      {children}
    </AuthContext.Provider>
  );
};