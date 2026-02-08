import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";
import ClassroomTable from "../components/ClassroomTable";

const Dashboard = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>("CS101");
  const [view, setView] = useState<"timetable" | "classrooms">("timetable");

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      {/* View toggle — always visible at top-right */}
      <div className="flex items-center justify-end px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("timetable")}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              view === "timetable"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            Timetable
          </button>
          <button
            onClick={() => setView("classrooms")}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              view === "classrooms"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 border border-gray-200"
            }`}
          >
            Classrooms
          </button>
        </div>
      </div>

      {view === "timetable" ? (
        /* Dashboard: sidebar + timetable */
        <div className="flex flex-1 min-h-0">
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <Sidebar
              selectedCourse={selectedCourse}
              onSelectCourse={setSelectedCourse}
            />
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <Timetable selectedCourse={selectedCourse} />
          </div>
        </div>
      ) : (
        /* Classrooms: full-width, no sidebar */
        <div className="flex-1 overflow-y-auto bg-white p-6">
          <ClassroomTable selectedCourse={selectedCourse} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
