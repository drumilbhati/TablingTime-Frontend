import "../index.css";
import React from "react";

const Timetable = () => {
  // TODO: Remove hardcoded data for rows and columns
  const days = [
    "Day",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const timeSlots = ["9:00", "10:00", "11:00", "12:00", "1:00", "2:00"];
  return (
    <div className="timetable-container">
      {days.map((day) => (
        <div key={day} className="cell header-cell">
          {day}
        </div>
      ))}

      {timeSlots.map((time) => (
        <React.Fragment key={time}>
          <div className="cell time-label">{time}</div>

          {[1, 2, 3, 4, 5, 6].map((colIndex) => (
            <div
              key={colIndex}
              className="cell empty-slot"
              onClick={() =>
                console.log(`Clicked ${time} on column ${colIndex}`)
              }
            ></div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Timetable;
