import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";

const Dashboard = () => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>("CS101");

  return (
    <div className="flex h-svh bg-white">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <Sidebar
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        <Timetable selectedCourse={selectedCourse} />
      </div>
    </div>
  );
};

export default Dashboard;
