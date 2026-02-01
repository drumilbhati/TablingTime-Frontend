import { useState } from "react";
import { Clock } from "lucide-react";

interface TimetableProps {
  selectedCourse: string | null;
}

const Timetable = ({ selectedCourse }: TimetableProps) => {
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string;
    time: string;
  } | null>(null);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const timeSlots = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  // Mock schedule data
  const scheduleData: {
    [key: string]: { course: string; room: string; color: string };
  } = {
    "Monday-9:00 AM": {
      course: "CS101",
      room: "Room 101",
      color: "bg-blue-50 border-blue-200",
    },
    "Tuesday-10:00 AM": {
      course: "CS102",
      room: "Room 102",
      color: "bg-green-50 border-green-200",
    },
    "Wednesday-11:00 AM": {
      course: "CS201",
      room: "Room 202",
      color: "bg-purple-50 border-purple-200",
    },
    "Thursday-2:00 PM": {
      course: "CS202",
      room: "Room 203",
      color: "bg-orange-50 border-orange-200",
    },
    "Friday-3:00 PM": {
      course: "CS301",
      room: "Room 303",
      color: "bg-pink-50 border-pink-200",
    },
  };

  const handleSlotClick = (day: string, time: string) => {
    setSelectedSlot({ day, time });
  };

  return (
    <div className="flex-1 flex flex-col bg-white p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Weekly Timetable</h1>
        <p className="text-gray-600 mt-2">
          {selectedCourse
            ? `Viewing schedule for ${selectedCourse}`
            : "Select a course from the sidebar"}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="max-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28 sticky left-0 bg-gray-50">
                  Time
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-32"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, timeIdx) => (
                <tr
                  key={time}
                  className={timeIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border-b border-r border-gray-200 px-4 py-4 font-medium text-sm text-gray-700 sticky left-0 bg-inherit align-middle">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{time}</span>
                    </div>
                  </td>
                  {days.map((day) => {
                    const key = `${day}-${time}`;
                    const classData = scheduleData[key];
                    const isSelected =
                      selectedSlot?.day === day && selectedSlot?.time === time;

                    return (
                      <td
                        key={day}
                        className={`border-b border-r border-gray-200 px-3 py-3 cursor-pointer transition-all align-top ${
                          isSelected
                            ? "bg-gray-200 ring-2 ring-inset ring-gray-400"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleSlotClick(day, time)}
                      >
                        {classData ? (
                          <div
                            className={`rounded-md border-2 ${classData.color} px-3 py-3 min-h-[64px] flex flex-col justify-center`}
                          >
                            <p className="font-semibold text-gray-900 text-sm leading-tight">
                              {classData.course}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {classData.room}
                            </p>
                          </div>
                        ) : (
                          <div className="min-h-[64px] flex items-center justify-center">
                            {isSelected && (
                              <span className="text-xs text-gray-500 font-medium">
                                Click to schedule
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSlot && (
        <div className="mt-6 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Selected Time Slot</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {selectedSlot.day} at {selectedSlot.time}
              </p>
            </div>
            <button className="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-medium transition-colors shadow-sm">
              Schedule Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
