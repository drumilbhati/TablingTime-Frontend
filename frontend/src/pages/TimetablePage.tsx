import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";

const TimetablePage = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>("CS101");

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      {/* Timetable with sidebar */}
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
    </div>
  );
};

export default TimetablePage;
