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

const OccupiedRooms = () => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [filteredCourses, setFileteredCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses");
        const data = await response.json();
        setCourses(data);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedDay || !selectedStartTime || !selectedEndTime) {
      setFileteredCourses(courses);
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

    setFileteredCourses(filtered);
  }, [courses, selectedDay, selectedStartTime, selectedEndTime]);

  return (
    <div className="w-full">
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
            {/* TODO: Map over filteredCourses and render each row */}
            {filteredCourses.map((course, idx) => (
              <tr
                key={course._id}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                  {/* TODO: Display course.courseId */}
                </td>
                <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                  {/* TODO: Display course["Course Name"] */}
                </td>
                <td className="border-b border-r border-gray-200 px-4 py-3 text-sm">
                  {/* TODO: Display course.Faculty */}
                </td>
                <td className="border-b border-gray-200 px-4 py-3 text-center text-sm">
                  {/* TODO: Display number of students: course.studentId.length */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OccupiedRooms;
