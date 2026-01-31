import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Timetable from '../components/Timetable';

const Dashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'timetable' | 'classroom'>('timetable');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 shadow-lg px-8 py-5 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white cursor-pointer hover:text-blue-50 transition-colors" onClick={() => setView('timetable')}>TablingTime</h1>
        <div className="flex gap-3">
          <button 
            className="px-5 py-2.5 bg-white text-sky-600 font-semibold rounded-lg hover:bg-blue-50 transition-all shadow-md hover:shadow-lg"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
          <button className="px-5 py-2.5 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-all shadow-md hover:shadow-lg border border-sky-400">
            Profile
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        <Sidebar 
          view={view}
          selectedCourse={selectedCourse}
          onCourseSelect={setSelectedCourse}
          onViewChange={setView}
        />
        <div className="flex-1 p-6">
          <Timetable 
            view={view}
            selectedCourse={selectedCourse}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
