import { useState } from 'react';

interface SidebarProps {
  view: 'timetable' | 'classroom';
  selectedCourse: string | null;
  onCourseSelect: (course: string | null) => void;
  onViewChange: (view: 'timetable' | 'classroom') => void;
}

const Sidebar = ({ view, selectedCourse, onCourseSelect, onViewChange }: SidebarProps) => {
  // Mock course data
  const courses = [
    { code: 'CS101', name: 'Introduction to Programming', section: '001' },
    { code: 'CS201', name: 'Data Structures', section: '002' },
    { code: 'CS301', name: 'Algorithms', section: '003' },
    { code: 'CS401', name: 'Database Systems', section: '004' },
    { code: 'CS501', name: 'Machine Learning', section: '005' },
  ];

  const [courseDetails] = useState({
    courseCode: 'CS101',
    section: '002',
    sectionCapacity: '50',
    courseSchool: 'Computer Science'
  });

  if (view === 'classroom') {
    return (
      <div className="w-72 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 p-6 shadow-xl">
        <button 
          onClick={() => onViewChange('timetable')}
          className="mb-6 text-sm text-sky-400 hover:text-sky-300 font-medium flex items-center gap-2 transition-colors"
        >
          ← Back to Timetable
        </button>
        <h2 className="text-xl font-bold mb-6 text-white">Course Details</h2>
        <div className="space-y-4">
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 shadow-md">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Selected Course Code</p>
            <p className="font-semibold text-white text-lg">{courseDetails.courseCode}</p>
          </div>
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 shadow-md">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Selected Section</p>
            <p className="font-semibold text-white text-lg">{courseDetails.section}</p>
          </div>
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 shadow-md">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Section Capacity</p>
            <p className="font-semibold text-white text-lg">{courseDetails.sectionCapacity}</p>
          </div>
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 shadow-md">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Course School</p>
            <p className="font-semibold text-white text-lg">{courseDetails.courseSchool}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-6 text-white">List of Courses</h2>
      <div className="space-y-3">
        {courses.map((course) => (
          <div
            key={course.code}
            onClick={() => onCourseSelect(course.code)}
            className={`p-4 rounded-lg border cursor-pointer transition-all transform hover:scale-105 shadow-md ${
              selectedCourse === course.code
                ? 'bg-gradient-to-r from-sky-500 to-blue-500 border-sky-400 shadow-sky-500/50'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500'
            }`}
          >
            <p className="font-bold text-sm text-white">{course.code}</p>
            <p className="text-xs text-gray-300 mt-1">{course.name}</p>
            <p className="text-xs text-gray-400 mt-1">Section {course.section}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-semibold">Role-based view:</p>
        <div className="text-xs text-gray-300 space-y-2">
          <p>• Admin: All courses</p>
          <p>• Students: Registered courses</p>
          <p>• Faculty: Teaching courses</p>
        </div>
      </div>
      <div className="mt-6">
        <button 
          onClick={() => onViewChange('classroom')}
          className="w-full px-5 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-lg hover:from-sky-500 hover:to-blue-600 transition-all text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          View Classroom Table
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
