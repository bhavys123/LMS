// src/components/ClassManagement.js
import React, { useState, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { db } from '../../firebase/firebaseConfig'; // Ensure this path is correct for your Firebase config
import { ref, update, onValue } from 'firebase/database'; // Added onValue for real-time data fetching
import { Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal'; // Assuming your Modal component path

// Main ClassManagement Component
// showToast is expected to be passed from a parent component (e.g., App.js)
const ClassManagement = ({ showToast }) => {
    // Initial state for the scheduling form
    const initialFormState = { 
        classId: '', 
        teacherId: '', 
        start: '', 
        end: '', 
        days: '', 
        startDate: '', 
        endDate: '' 
    };
    const [scheduleForm, setScheduleForm] = useState(initialFormState);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // State to hold data fetched from Firebase
    const [classesList, setClassesList] = useState([]);
    const [teachersList, setTeachersList] = useState([]);
    // Students list is not directly used in this component's logic but kept for context if needed
    const [studentsList, setStudentsList] = useState([]); 

    // --- Firebase Data Fetching and Synchronization ---
    // This useEffect hook is crucial for keeping your component's state synchronized
    // with your Firebase Realtime Database. It sets up listeners for your 'classes',
    // 'teachers', and 'students' nodes and updates the local state whenever data changes.
    useEffect(() => {
        const classesRef = ref(db, 'classes');
        const teachersRef = ref(db, 'teachers');
        const studentsRef = ref(db, 'students'); // Assuming a 'students' node in your DB

        // Setup listener for classes
        const unsubscribeClasses = onValue(classesRef, (snapshot) => {
            const data = snapshot.val();
            const loadedClasses = data ? Object.keys(data).map(key => ({ ClassID: key, ...data[key] })) : [];
            setClassesList(loadedClasses);
            // console.log("Firebase: Fetched Classes:", loadedClasses); // Uncomment for debugging
        }, (error) => {
            console.error("Firebase: Error fetching classes:", error);
            showToast(`Error fetching classes: ${error.message}`, "error");
        });

        // Setup listener for teachers
        const unsubscribeTeachers = onValue(teachersRef, (snapshot) => {
            const data = snapshot.val();
            const loadedTeachers = data ? Object.keys(data).map(key => ({ TeacherID: key, ...data[key] })) : [];
            setTeachersList(loadedTeachers);
            // console.log("Firebase: Fetched Teachers:", loadedTeachers); // Uncomment for debugging
        }, (error) => {
            console.error("Firebase: Error fetching teachers:", error);
            showToast(`Error fetching teachers: ${error.message}`, "error");
        });
        
        // Setup listener for students (if relevant for this component)
        const unsubscribeStudents = onValue(studentsRef, (snapshot) => {
            const data = snapshot.val();
            const loadedStudents = data ? Object.keys(data).map(key => ({ StudentID: key, ...data[key] })) : [];
            setStudentsList(loadedStudents);
            // console.log("Firebase: Fetched Students:", loadedStudents); // Uncomment for debugging
        }, (error) => {
            console.error("Firebase: Error fetching students:", error);
            showToast(`Error fetching students: ${error.message}`, "error");
        });

        // Cleanup function: This runs when the component unmounts,
        // ensuring that Firebase listeners are detached to prevent memory leaks.
        return () => {
            unsubscribeClasses();
            unsubscribeTeachers();
            unsubscribeStudents();
        };
    }, [showToast]); // Dependency array: Re-run if showToast changes (unlikely, but good practice)


    // Memoized computation for FullCalendar events.
    // This will only re-calculate if 'classesList' or 'teachersList' change.
    const calendarEvents = useMemo(() => {
        const events = [];
        // FullCalendar's daysOfWeek mapping: Sunday = 0, Monday = 1, ..., Saturday = 6
        const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
        
        (classesList || []).forEach(cls => {
            // Defensive check: Ensure essential scheduling data exists for a class
            if (!cls.StartTime || !cls.Days || !cls.ClassName || !cls.ClassID) {
                // console.warn(`Skipping class (ID: ${cls.ClassID || 'N/A'}) due to missing StartTime, Days, ClassName, or ClassID:`, cls);
                return; 
            }

            // Robustly parse the 'Days' string into an array of numbers for FullCalendar.
            // Filters out any entries that don't map to a valid day (e.g., empty strings from double commas).
            const classDays = cls.Days.toLowerCase()
                                .split(',')
                                .map(d => dayMap[d.trim()])
                                .filter(d => d !== undefined); 

            // If no valid days are parsed, this event cannot be scheduled recurrently
            if (classDays.length === 0) {
                // console.warn(`No valid recurring days found for class ${cls.ClassID}:`, cls.Days);
                return;
            }

            // Find the assigned teacher for display purposes
            const teacher = (teachersList || []).find(t => t.TeacherID === cls.TeacherID);
            
            events.push({
                id: cls.ClassID, // Use ClassID as event ID for easier lookup in eventClick
                title: `${cls.ClassName}`,
                extendedProps: { 
                    classId: cls.ClassID, 
                    teacherName: teacher ? teacher.TeacherName : 'N/A',
                    teacherId: cls.TeacherID, // Store teacherId for form pre-population
                    rawDays: cls.Days, // Store original days string for form pre-population
                    startDate: cls.StartDate,
                    endDate: cls.EndDate,
                    startTime: cls.StartTime,
                    endTime: cls.EndTime,
                },
                daysOfWeek: classDays,
                startTime: cls.StartTime,
                endTime: cls.EndTime,
                // FullCalendar expects 'undefined' to not apply recurrences, not empty string or null
                startRecur: cls.StartDate || undefined, 
                endRecur: cls.EndDate || undefined,     
                // Color events differently if they have a defined semester range
                backgroundColor: cls.StartDate && cls.EndDate ? '#3788d8' : '#6b7280', // Blue for recurring, gray for general
                borderColor: cls.StartDate && cls.EndDate ? '#3788d8' : '#6b7280',
            });
        });
        // console.log("FullCalendar Events generated:", events); // Uncomment for debugging
        return events;
    }, [classesList, teachersList]); // Dependencies: Re-run if these lists change

    // Handles opening the schedule modal, optionally pre-filling it with class data for editing.
    const handleOpenScheduleModal = (classData = null) => {
        if (classData && classData.ClassID) { // Ensure classData is valid and has an ID
            // console.log("Opening modal for editing class schedule:", classData.ClassID); // Debugging
            setScheduleForm({
                classId: classData.ClassID,
                teacherId: classData.TeacherID || '',
                start: classData.StartTime || '',
                end: classData.EndTime || '',
                days: classData.Days || '',
                startDate: classData.StartDate || '',
                endDate: classData.EndDate || '',
            });
        } else {
            // For assigning a new schedule or managing generically, reset to initial state
            // console.log("Opening modal for new schedule assignment or generic management."); // Debugging
            setScheduleForm(initialFormState);
        }
        setIsScheduleModalOpen(true);
    };

    // Handles saving the schedule details to Firebase.
    const handleSetSchedule = () => {
        const { classId, teacherId, start, end, days, startDate, endDate } = scheduleForm;

        // --- Frontend Validation ---
        if (!classId) {
            return showToast("Please select a class to schedule.", "error");
        }
        if (!teacherId) {
            return showToast("Please assign a teacher to the class.", "error");
        }
        if (!start || !end) {
            return showToast("Start Time and End Time are required.", "error");
        }
        if (!days || days.trim() === '') {
            return showToast("Recurring Days are required (e.g., Mon, Wed, Fri).", "error");
        }
        
        // Validate date ranges for semester if provided
        const hasStartDate = !!startDate;
        const hasEndDate = !!endDate;

        if (hasStartDate !== hasEndDate) { // Check if only one date is provided (XOR)
            return showToast("Both 'Semester Start Date' and 'Semester End Date' must be provided, or neither.", "error");
        }
        if (hasStartDate && hasEndDate) { // If both are provided, validate their order
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            if (startD >= endD) {
                return showToast("Semester End Date must be after Semester Start Date.", "error");
            }
        }

        // Prepare the updates object for Firebase.
        // If start/end dates are not both present, explicitly set them to null in Firebase
        // to clear any previous values. This ensures data consistency.
        const updates = { 
            TeacherID: teacherId, 
            StartTime: start, 
            EndTime: end, 
            Days: days.trim(), // Trim whitespace for consistency in 'Days' string
            StartDate: hasStartDate ? startDate : null, 
            EndDate: hasEndDate ? endDate : null 
        };
        
        // Log the updates object before sending to Firebase. This is crucial for debugging
        // the "data not displaying in the backend storing" issue. Check your console
        // to see exactly what data is being sent to Firebase.
        // console.log(`Firebase: Attempting to update class /classes/${classId} with:`, updates);

        // Perform the Firebase update operation
        update(ref(db, `classes/${classId}`), updates)
            .then(() => {
                showToast("Schedule and teacher assignment updated successfully!", "success");
                setIsScheduleModalOpen(false); // Close modal on success
                setScheduleForm(initialFormState); // Clear form after successful submission
            })
            .catch(e => {
                // Log detailed error from Firebase for better debugging
                console.error("Firebase: Error updating schedule:", e); 
                showToast(`Error updating schedule: ${e.message}`, "error");
            });
    };

    // Handles clicks on calendar events to open the modal for editing
    const handleEventClick = (clickInfo) => {
        // console.log("FullCalendar: Event Clicked:", clickInfo.event.extendedProps); // Debugging
        // Reconstruct classData from extendedProps to pre-populate the form
        const classData = {
            ClassID: clickInfo.event.extendedProps.classId,
            ClassName: clickInfo.event.title, 
            TeacherID: clickInfo.event.extendedProps.teacherId,
            StartTime: clickInfo.event.extendedProps.startTime,
            EndTime: clickInfo.event.extendedProps.endTime,
            Days: clickInfo.event.extendedProps.rawDays, // Use the stored raw string
            StartDate: clickInfo.event.extendedProps.startDate,
            EndDate: clickInfo.event.extendedProps.endDate,
        };
        handleOpenScheduleModal(classData);
    };
    
    return (
        <>
            <div className="content-card">
                <div className="card-header">
                  <span className="card-title">Class Timetable</span>
                  <button className="btn-primary" onClick={() => handleOpenScheduleModal()}>
                      <Plus size={16}/> Manage Schedules
                  </button>
                </div>

                <div className="calendar-container" style={{marginTop: '20px'}}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                        initialView="dayGridMonth" // Default view
                        headerToolbar={{ 
                            left: 'prev,next today', 
                            center: 'title', 
                            right: 'dayGridMonth,timeGridWeek,listWeek' // View options
                        }}
                        events={calendarEvents} // Pass the memoized events
                        eventClick={handleEventClick} // Handle event clicks
                        // Custom rendering for event content
                        eventContent={(eventInfo) => (
                            <div style={{overflow: 'hidden'}}>
                                <b>{eventInfo.timeText}</b>
                                <div style={{whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>{eventInfo.event.title}</div>
                                <i style={{fontSize: '0.9em'}}>{eventInfo.event.extendedProps.teacherName}</i>
                            </div>
                        )}
                        height="auto" // Adjust calendar height automatically
                        // Optional FullCalendar properties for better UX
                        // slotMinTime="08:00:00" // Example: Start displaying slots from 8 AM
                        // slotMaxTime="20:00:00" // Example: End displaying slots at 8 PM
                        // expandRows={true} // Allow rows to expand to fill available height
                    />
                </div>
            </div>

            {/* MODAL FOR SETTING/EDITING A SCHEDULE */}
            {isScheduleModalOpen && (
                <Modal 
                  title="Manage Class Schedule & Assignment" 
                  onClose={() => setIsScheduleModalOpen(false)}
                >
                    <div className="form-group">
                        <label htmlFor="classSelect">Select or Edit a Class Schedule</label>
                        <select 
                            id="classSelect"
                            className="form-control" 
                            value={scheduleForm.classId} 
                            onChange={e => {
                                const selectedClass = (classesList || []).find(c => c.ClassID === e.target.value);
                                // If a class is selected, pre-fill the form; otherwise, reset it.
                                handleOpenScheduleModal(selectedClass || null); 
                            }}
                        >
                            <option value="">-- Select a Class --</option>
                            {(classesList || []).map(cls => (
                                <option key={cls.ClassID} value={cls.ClassID}>
                                    {cls.ClassName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="teacherSelect">Assign a Teacher</label>
                        <select
                            id="teacherSelect"
                            className="form-control"
                            value={scheduleForm.teacherId}
                            onChange={e => setScheduleForm({...scheduleForm, teacherId: e.target.value})}
                            disabled={!scheduleForm.classId} // Disable if no class is selected for context
                        >
                            <option value="">-- Select a Teacher --</option>
                            {(teachersList || []).map(t => (
                                <option key={t.TeacherID} value={t.TeacherID}>
                                    {t.TeacherName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label htmlFor="startDate">Semester Start Date <small>(Optional for recurring)</small></label>
                            <input 
                                type="date" 
                                id="startDate"
                                className="form-control" 
                                value={scheduleForm.startDate || ''} // Ensure it's an empty string if null
                                onChange={e=>setScheduleForm({...scheduleForm, startDate: e.target.value})} 
                                disabled={!scheduleForm.classId} // Disable if no class is selected
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="endDate">Semester End Date <small>(Optional for recurring)</small></label>
                            <input 
                                type="date" 
                                id="endDate"
                                className="form-control" 
                                value={scheduleForm.endDate || ''} // Ensure it's an empty string if null
                                onChange={e=>setScheduleForm({...scheduleForm, endDate: e.target.value})} 
                                disabled={!scheduleForm.classId} // Disable if no class is selected
                            />
                        </div>
                    </div>
                    
                    <div className="grid-2">
                        <div className="form-group">
                            <label htmlFor="startTime">Start Time</label>
                            <input 
                                type="time" 
                                id="startTime"
                                className="form-control" 
                                value={scheduleForm.start} 
                                onChange={e=>setScheduleForm({...scheduleForm, start: e.target.value})} 
                                disabled={!scheduleForm.classId} // Disable if no class is selected
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="endTime">End Time</label>
                            <input 
                                type="time" 
                                id="endTime"
                                className="form-control" 
                                value={scheduleForm.end} 
                                onChange={e=>setScheduleForm({...scheduleForm, end: e.target.value})} 
                                disabled={!scheduleForm.classId} // Disable if no class is selected
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="recurringDays">Recurring Days</label>
                        <input 
                            id="recurringDays"
                            className="form-control" 
                            placeholder="e.g., Mon, Wed, Fri (comma-separated short names)" 
                            value={scheduleForm.days} 
                            onChange={e=>setScheduleForm({...scheduleForm, days: e.target.value})} 
                            disabled={!scheduleForm.classId} // Disable if no class is selected
                        />
                    </div>
                    
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleSetSchedule} disabled={!scheduleForm.classId}>Save Schedule</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default ClassManagement;