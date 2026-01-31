import "../index.css";
import React, { useState } from "react";
import ClassroomTable from './ClassroomTable';

interface TimetableProps {
  view: 'timetable' | 'classroom';
  selectedCourse: string | null;
}

const Timetable = ({ view, selectedCourse }: TimetableProps) => {
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);

  const days = [
    "Day",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

  // Mock schedule data
  const scheduleData: { [key: string]: { course: string; room: string } } = {
    "Monday-9:00 AM": { course: "CS101", room: "Room 101" },
    "Wednesday-11:00 AM": { course: "CS201", room: "Room 202" },
    "Friday-2:00 PM": { course: "CS301", room: "Room 303" },
  };

  const handleSlotClick = (day: string, time: string) => {
    if (day !== "Day") {
      setSelectedSlot({ day, time });
    }
  };

  if (view === 'classroom') {
    return <ClassroomTable />;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Weekly Schedule</h2>
        <p className="text-sm text-gray-600">
          Click on any time slot to schedule a class
        </p>
      </div>
      <div className="timetable-container">
        {days.map((day) => (
          <div key={day} className="cell header-cell">
            {day}
          </div>
        ))}

        {timeSlots.map((time) => (
          <React.Fragment key={time}>
            <div className="cell time-label font-medium">{time}</div>

            {days.slice(1).map((day) => {
              const key = `${day}-${time}`;
              const classData = scheduleData[key];

              return (
                <div
                  key={day}
                  className={`cell ${
                    classData ? 'bg-gradient-to-br from-sky-100 to-blue-100 border-sky-300 shadow-md' : 'empty-slot'
                  }`}
                  onClick={() => handleSlotClick(day, time)}
                >
                  {classData && (
                    <div className="text-sm">
                      <p className="font-bold text-sky-900">{classData.course}</p>
                      <p className="text-xs text-blue-700 font-medium">{classData.room}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {selectedSlot && (
        <div className="mt-6 p-6 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-300 rounded-xl shadow-lg">
          <p className="text-base text-gray-800">
            Selected: <span className="font-bold text-sky-600">{selectedSlot.day}</span> at{' '}
            <span className="font-bold text-sky-600">{selectedSlot.time}</span>
          </p>
          <button className="mt-4 px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-lg hover:from-sky-500 hover:to-blue-600 text-sm font-bold shadow-md hover:shadow-xl transition-all transform hover:scale-105">
            Schedule Class
          </button>
        </div>
      )}
    </div>
  );
};

export default Timetable;
