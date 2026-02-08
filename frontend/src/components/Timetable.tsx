interface TimetableProps {
  selectedCourse: string | null;
}

const Timetable = ({ selectedCourse: _selectedCourse }: TimetableProps) => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  
  

  // Empty rows for the timetable (no schedule data yet)
  const rows = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col bg-white p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                Day
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
            {rows.map((rowIdx) => (
              <tr
                key={rowIdx}
                className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border-b border-r border-gray-200 px-4 py-4 text-sm text-gray-700 bg-inherit"></td>
                {days.map((day) => (
                  <td
                    key={day}
                    className="border-b border-r border-gray-200 px-3 py-3 min-h-[64px] h-16"
                  ></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Timetable;
