/*
  shows the table with all the courses that currently occupy this timeslot
  shows the corresponding room that is occupied

  input: timeslot
  output: list of (courses, room)
*/

import { useState } from "react";
import { X } from "lucide-react";
import {
  useCourses,
  type Course as CourseData,
} from "../context/CoursesContext";
import ErrorState from "../components/ErrorState";

interface TimeslotKey {
  day: string;
  startTime: string;
  endTime: string;
}

const OccupiedRooms = () => {
  const { courses, loading, error, refetch } = useCourses();
  const [selectedTimeslot, setSelectedTimeslot] = useState<TimeslotKey | null>(
    null,
  );

  if (error) {
    return (
      <div className="w-full flex flex-col h-[calc(100svh-73px)] bg-white">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  // Extract unique timeslots and sort them
  const getUniqueTimeslots = (): TimeslotKey[] => {
    const timeslots = new Map<string, TimeslotKey>();
    courses.forEach((course) => {
      course.timeslots.forEach((slot) => {
        const key = `${slot.startTime}|${slot.endTime}`;
        if (!timeslots.has(key)) {
          timeslots.set(key, {
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      });
    });

    // Sort by time only (same timeslots appear in multiple days)
    return Array.from(timeslots.values()).sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  // Get courses for a specific timeslot
  const getCoursesForTimeslot = (
    day: string,
    startTime: string,
    endTime: string,
  ): CourseData[] => {
    return courses.filter((course) =>
      course.timeslots.some(
        (slot) =>
          slot.day === day &&
          slot.startTime === startTime &&
          slot.endTime === endTime,
      ),
    );
  };

  // Map short day names to full names
  const dayFullNames: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
  };

  const timeslots = getUniqueTimeslots();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full flex flex-col h-[calc(100svh-73px)] bg-white">
      {loading && <div className="p-4 text-gray-500">Loading courses...</div>}

      {!loading && (
        <>
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Occupied Classrooms
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Timetable view of scheduled courses
            </p>
          </div>

          {/* Timetable Grid */}
          <div className="flex-1 overflow-auto p-6">
            {timeslots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No courses scheduled
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">
                        Time Slot
                      </th>
                      {days.map((day) => (
                        <th
                          key={day}
                          className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-48"
                        >
                          {dayFullNames[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeslots.map((timeslot, idx) => (
                      <tr
                        key={`${timeslot.day}|${timeslot.startTime}|${timeslot.endTime}`}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border-b border-r border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 bg-inherit whitespace-nowrap">
                          {timeslot.startTime} - {timeslot.endTime}
                        </td>
                        {days.map((day) => {
                          const cellCourses = getCoursesForTimeslot(
                            day,
                            timeslot.startTime,
                            timeslot.endTime,
                          );
                          return (
                            <td
                              key={day}
                              onClick={() =>
                                cellCourses.length > 0 &&
                                setSelectedTimeslot({ ...timeslot, day })
                              }
                              className={`border-b border-r border-gray-200 px-3 py-3 min-h-20 align-center ${
                                cellCourses.length > 0
                                  ? "bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                                  : "bg-white"
                              }`}
                            >
                              {cellCourses.length > 0 && (
                                <div className="flex items-center justify-center h-full">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {cellCourses.length}
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      course
                                      {cellCourses.length !== 1 ? "s" : ""}
                                    </div>
                                  </div>
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
            )}
          </div>
        </>
      )}

      {/* Modal for timeslot details */}
      {selectedTimeslot && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTimeslot(null)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {dayFullNames[selectedTimeslot.day]}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedTimeslot.startTime} - {selectedTimeslot.endTime}
                </p>
              </div>
              <button
                onClick={() => setSelectedTimeslot(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Courses List */}
            <div className="p-6">
              {(() => {
                const courses = getCoursesForTimeslot(
                  selectedTimeslot.day,
                  selectedTimeslot.startTime,
                  selectedTimeslot.endTime,
                );
                return (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div
                        key={course._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {course.courseId}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {course["Course Name"]}
                            </p>
                          </div>
                          {course.room.length > 0 && (
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-4">
                              Room: {course.room.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <span className="font-medium text-gray-900">
                              Faculty:
                            </span>
                            <p>{course.Faculty}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              Credits:
                            </span>
                            <p>{course.Credits}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              Students:
                            </span>
                            <p>{course.studentId.length}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OccupiedRooms;
