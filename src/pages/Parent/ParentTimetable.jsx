import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Helper function to format time strings (e.g., "9:30" -> "9:30 AM")
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${adjustedHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const ParentTimetable = ({ myClasses }) => { // myClasses here are actually selectedChildClasses
    const [currentDate, setCurrentDate] = useState(new Date());

    // Define daysOfWeek inside the component but outside useMemo if it's not a global constant.
    // This makes it a stable reference for the useMemo dependency.
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Memoize the classes grouped by day for efficient lookup
    const classesByDay = useMemo(() => {
        const grouped = {};
        daysOfWeek.forEach(day => grouped[day] = []);

        myClasses.forEach(c => {
            if (c.Days) {
                const classDays = String(c.Days).split(',').map(d => d.trim());
                classDays.forEach(day => {
                    const dayKey = daysOfWeek.find(d => day.toLowerCase().startsWith(d.toLowerCase()));
                    if (dayKey && grouped[dayKey]) {
                        grouped[dayKey].push(c);
                    }
                });
            }
        });
        
        for (const day in grouped) {
            grouped[day].sort((a, b) => parseInt(a.StartTime.replace(':', '')) - parseInt(b.StartTime.replace(':', '')));
        }
        
        return grouped;
    }, [myClasses, daysOfWeek]); // Added daysOfWeek to the dependency array


    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = daysOfWeek[date.getDay()];
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            const potentialClasses = classesByDay[dayOfWeek] || [];
            
            // --- FIX: Logic to robustly filter classes by EndDate ---
            const validClassesForDate = potentialClasses.filter(cls => {
                if (!cls.EndDate) {
                    return true; // If no end date, the class is always valid.
                }

                const parts = cls.EndDate.split('-'); // e.g., ["2025", "12", "19"]
                const endYear = parseInt(parts[0], 10);
                const endMonth = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
                const endDay = parseInt(parts[2], 10);
                
                const endDate = new Date(endYear, endMonth, endDay);
                endDate.setHours(23, 59, 59, 999);
                
                return date <= endDate;
            });
            // --- END OF FIX ---

            calendarDays.push(
                <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                    <div className="day-number">{day}</div>
                    <div className="events">
                        {validClassesForDate.map(cls => (
                            <div key={cls.ClassID} className="event">
                                <div className="event-time">{formatTime(cls.StartTime)}</div>
                                <div className="event-title">{cls.ClassName}</div>
                                <div className="event-subtitle">{cls.SubjectName}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return calendarDays;
    };
    
    return (
        <div className="content-card" style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.headerTitle}>Child's Class Timetable</h3>
                <div style={styles.controls}>
                    <button style={styles.navButton} onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                    <button style={styles.navButton} onClick={handleNextMonth}><ChevronRight size={20} /></button>
                    <button style={styles.todayButton} onClick={handleToday}>Today</button>
                </div>
                <div style={styles.monthDisplay}>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div style={styles.calendarGrid}>
                {daysOfWeek.map(day => (
                    <div key={day} style={styles.dayHeader}>{day}</div>
                ))}
                {renderCalendar()}
            </div>
            
            <style>{`
                .calendar-day {
                    border-right: 1px solid #e2e8f0;
                    border-top: 1px solid #e2e8f0;
                    padding: 8px;
                    min-height: 120px;
                    display: flex;
                    flex-direction: column;
                }
                .calendar-day:nth-child(7n) {
                    border-right: none;
                }
                .calendar-day.empty {
                    background-color: #f8fafc;
                }
                .calendar-day.today {
                    background-color: #fefce8;
                }
                .day-number {
                    font-weight: 500;
                    color: #475569;
                    font-size: 0.8rem;
                    margin-bottom: 5px;
                }
                .events {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                    flex-grow: 1;
                }
                .event {
                    background-color: #eef2ff;
                    color: #312e81;
                    border-left: 3px solid #4f46e5;
                    padding: 4px 6px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                }
                .event-time {
                    font-weight: 700;
                }
                .event-title {
                    font-weight: 600;
                }
                .event-subtitle {
                    color: #4338ca;
                    font-size: 0.7rem;
                }
            `}</style>
        </div>
    );
};

// --- STYLES OBJECT ---
const styles = {
    container: {
        fontFamily: 'sans-serif'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        flexWrap: 'wrap',
    },
    headerTitle: {
        margin: 0,
        color: '#1e293b'
    },
    controls: {
        marginLeft: '20px',
        display: 'flex',
        alignItems: 'center'
    },
    navButton: {
        background: '#fff',
        border: '1px solid #cbd5e1',
        padding: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayButton: {
        background: '#fff',
        border: '1px solid #cbd5e1',
        padding: '6px 12px',
        cursor: 'pointer',
        marginLeft: '5px',
        borderRadius: '6px',
        fontSize: '0.9rem'
    },
    monthDisplay: {
        fontWeight: 600,
        fontSize: '1.2rem',
        color: '#334155',
        marginLeft: 'auto',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderLeft: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
    },
    dayHeader: {
        textAlign: 'center',
        padding: '10px 0',
        fontWeight: 'bold',
        color: '#64748b',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderRight: '1px solid #e2e8f0',
    }
};

export default ParentTimetable;