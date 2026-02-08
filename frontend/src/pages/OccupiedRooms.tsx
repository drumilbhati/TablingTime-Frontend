/*
  shows the table with all the courses that currently occupy this timeslot
  shows the corresponding room that is occupied

  input: timeslot
  output: list of (courses, room)
*/

import { useState, useEffect } from "react";

// represents a single timeslot
interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  _id: string;
}

interface CourseData {
  _id: string;
  courseId: string;
  "Course Code": string;
  "Course Name": string;
  Faculty: string;
  Credits: string;
  courseType: string;
  studentId: string[];
  room: string[];
  timeslots: TimeSlot[];
}

interface OccupiedRoomsProps {
  selectedDay?: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
}

const OccupiedRooms = ({
  selectedDay = "",
  selectedStartTime = "",
  selectedEndTime = "",
}: OccupiedRoomsProps) => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiBaseUrl}/api/courses`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setCourses(data);
      } catch (err) {
        console.warn("Failed to fetch courses from API, using mock data:", err);
        // Fallback to mock data
        const mockCourses: CourseData[] = [
          {
            _id: "1",
            courseId: "CSE540",
            "Course Code": "CSE540[Graduate Master's]",
            "Course Name": "Cloud Computing",
            Faculty: "Sanjay Chaudhary",
            Credits: "3",
            courseType: "ELECTIVE",
            studentId: ["44", "83"],
            room: [],
            timeslots: [
              { day: "Mon", startTime: "09:30", endTime: "11:00", _id: "1a" },
              { day: "Wed", startTime: "09:30", endTime: "11:00", _id: "1b" },
            ],
          },
        ];
        setCourses(mockCourses);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedDay || !selectedStartTime || !selectedEndTime) {
      setFilteredCourses(courses);
      return;
    }

    const filtered = courses.filter((course) => {
      return course.timeslots.some((slot) => {
        const dayMap: Record<string, string> = {
          Mon: "Monday",
          Tue: "Tuesday",
          Wed: "Wednesday",
          Thu: "Thursday",
          Fri: "Friday",
          Sat: "Saturday",
        };

        return (
          dayMap[slot.day] === selectedDay &&
          slot.startTime === selectedStartTime &&
          slot.endTime === selectedEndTime
        );
      });
    });

    setFilteredCourses(filtered);
  }, [courses, selectedDay, selectedStartTime, selectedEndTime]);

  return (
    <div className="w-full">
      {loading && <div className="p-4 text-gray-500">Loading courses...</div>}

      {!loading && (
        <>
          {/*Header*/}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Classrooms</h2>
            {selectedDay && selectedStartTime && selectedEndTime && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedDay} - {selectedStartTime} : {selectedEndTime}
              </p>
            )}
          </div>

          {/*Table*/}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Course Code
                  </th>
                  <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Course Name
                  </th>
                  <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Faculty
                  </th>
                  <th className="border-b border-r border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-600">
                    Students
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="border-b border-gray-200 px-4 py-4 text-center text-gray-500"
                    >
                      No courses scheduled
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course, idx) => (
                    <tr
                      key={course._id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                        {course.courseId}
                      </td>
                      <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                        {course["Course Name"]}
                      </td>
                      <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                        {course.Faculty}
                      </td>
                      <td className="border-b border-gray-200 px-4 py-3 text-center text-sm">
                        {course.studentId.length}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default OccupiedRooms;
