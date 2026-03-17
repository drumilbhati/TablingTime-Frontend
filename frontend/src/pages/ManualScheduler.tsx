import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Clock, Users, BookOpen } from "lucide-react";
import { useCourses, type Course } from "../context/CoursesContext";
import { useAuth } from "../context/AuthContext";
import RoomSelector from "../components/RoomSelector";
import schedulingService from "../services/schedulingService";
import type { Room, Slot } from "../services/schedulingService";
import ErrorState from "../components/ErrorState";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

const COURSE_TYPE_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  CORE: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
  },
  ELECTIVE: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
  },
  LAB: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-50",
  border: "border-gray-200",
  text: "text-gray-700",
};

const ManualScheduler = () => {
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
  } = useCourses();
  const { userRole } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [schedulingSuccess, setSchedulingSuccess] = useState<string | null>(
    null,
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showRoomSelector, setShowRoomSelector] = useState(false);

  // Fetch slots and rooms on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSlotsLoading(true);
        const slotsData = await schedulingService.getAllSlots();
        setSlots(slotsData);
      } catch (err) {
        setDataError(
          err instanceof Error ? err.message : "Failed to fetch slots",
        );
      } finally {
        setSlotsLoading(false);
      }

      try {
        setRoomsLoading(true);
        const roomsData = await schedulingService.getAllRooms();
        setRooms(roomsData);
      } catch (err) {
        setDataError(
          err instanceof Error ? err.message : "Failed to fetch rooms",
        );
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unscheduled courses (no timeslots)
  const unscheduledCourses = courses.filter(
    (course) => !course.timeslots || course.timeslots.length === 0,
  );

  // Get unique timeslots across all slots
  const getUniqueTimeslots = useCallback((): {
    startTime: string;
    endTime: string;
  }[] => {
    const seen = new Map<string, { startTime: string; endTime: string }>();
    slots.forEach((slot) => {
      const key = `${slot.startTime}|${slot.endTime}`;
      if (!seen.has(key)) {
        seen.set(key, { startTime: slot.startTime, endTime: slot.endTime });
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }, [slots]);

  // Get slot for a specific day and time
  const getSlotForDayTime = useCallback(
    (day: string, startTime: string, endTime: string): Slot | null => {
      return (
        slots.find(
          (slot) =>
            slot.days.includes(day) &&
            slot.startTime === startTime &&
            slot.endTime === endTime,
        ) || null
      );
    },
    [slots],
  );

  const handleDragStart = (course: Course) => {
    setDraggedCourse(course);
    setSchedulingError(null);
    setSchedulingSuccess(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-blue-100", "border-blue-400");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-blue-100", "border-blue-400");
  };

  const handleDropOnSlot = (
    e: React.DragEvent,
    day: string,
    startTime: string,
    endTime: string,
  ) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-blue-100", "border-blue-400");

    if (!draggedCourse) return;

    const slot = getSlotForDayTime(day, startTime, endTime);
    if (!slot) {
      setSchedulingError("No slot found for this day and time");
      return;
    }

    // Check if course credits match slot credits
    if (Number(draggedCourse.Credits) !== slot.credit) {
      setSchedulingError(
        `Course credits (${draggedCourse.Credits}) do not match slot credits (${slot.credit})`,
      );
      return;
    }

    setSelectedSlot(slot);
    setShowRoomSelector(true);
  };

  const handleRoomSelect = async (roomNumber: string) => {
    if (!draggedCourse || !selectedSlot) return;

    try {
      setIsScheduling(true);
      setSchedulingError(null);
      setSchedulingSuccess(null);

      await schedulingService.manualScheduleCourse({
        courseId: draggedCourse.courseId,
        slotCode: selectedSlot.code,
        roomNumber,
      });

      setSchedulingSuccess(
        `${draggedCourse.courseId} scheduled successfully in Room ${roomNumber}!`,
      );
      setShowRoomSelector(false);
      setDraggedCourse(null);
      setSelectedSlot(null);

      // Refresh rooms data
      const updatedRooms = await schedulingService.getAllRooms();
      setRooms(updatedRooms);
    } catch (err) {
      setSchedulingError(
        err instanceof Error ? err.message : "Failed to schedule course",
      );
    } finally {
      setIsScheduling(false);
    }
  };

  // Only admins can access this
  if (userRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-[calc(100svh-73px)] bg-white">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only administrators can access the manual scheduler.
          </p>
        </div>
      </div>
    );
  }

  if (coursesError || dataError) {
    return (
      <div className="flex-1 flex flex-col bg-white p-4">
        <ErrorState
          error={coursesError || dataError || "Unknown error"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const timeslots = getUniqueTimeslots();

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Manual Scheduler</h1>
        <p className="text-sm text-gray-600 mt-1">
          Drag courses from the left panel and drop them on a time slot to
          schedule
        </p>
      </div>

      {/* Alerts */}
      {schedulingError && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle
            className="text-red-600 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div>
            <p className="text-sm font-medium text-red-800">
              {schedulingError}
            </p>
          </div>
        </div>
      )}

      {schedulingSuccess && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <div className="text-green-600 flex-shrink-0 mt-0.5">✓</div>
          <div>
            <p className="text-sm font-medium text-green-800">
              {schedulingSuccess}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Unscheduled Courses */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <h2 className="font-semibold text-gray-900">Unscheduled Courses</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {unscheduledCourses.length} course
              {unscheduledCourses.length !== 1 ? "s" : ""}
            </p>
          </div>

          {coursesLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : unscheduledCourses.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400 p-4">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm font-medium">
                  All courses are scheduled!
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3">
              {unscheduledCourses.map((course) => {
                const colors =
                  COURSE_TYPE_COLORS[course.courseType] ?? DEFAULT_COLORS;
                const isBeingDragged =
                  draggedCourse?.courseId === course.courseId;

                return (
                  <div
                    key={course._id}
                    draggable
                    onDragStart={() => handleDragStart(course)}
                    onDragEnd={() => setDraggedCourse(null)}
                    className={`p-3 rounded-lg border-2 cursor-move mb-2 transition-all ${
                      isBeingDragged
                        ? "opacity-50 scale-95"
                        : `${colors.bg} ${colors.border} hover:shadow-md`
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">
                      {course.courseId}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 truncate">
                      {course["Course Name"]}
                    </div>
                    <div className="flex gap-2 mt-2 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={12} />
                        {course.studentId.length}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock size={12} />
                        {course.Credits}cr
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main timetable area */}
        <div className="flex-1 overflow-y-auto p-4">
          {slotsLoading || roomsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : timeslots.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <div className="text-sm font-medium">
                  No time slots available
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32 sticky left-0 bg-gray-50 z-10">
                      Time
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-48"
                      >
                        {DAY_FULL[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeslots.map(({ startTime, endTime }, rowIdx) => (
                    <tr
                      key={`${startTime}|${endTime}`}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {/* Time label */}
                      <td className="border-b border-r border-gray-200 px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-inherit z-10">
                        <div>{startTime}</div>
                        <div className="text-gray-400">{endTime}</div>
                      </td>

                      {/* Day cells - drop zones */}
                      {DAYS.map((day) => (
                        <td
                          key={day}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) =>
                            handleDropOnSlot(e, day, startTime, endTime)
                          }
                          className="border-b border-r border-gray-200 px-2 py-3 align-top min-h-24 border-dashed transition-colors cursor-drop"
                        >
                          <div className="text-xs text-gray-400 text-center py-8">
                            Drop course here
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Room Selector Modal */}
      <RoomSelector
        isOpen={showRoomSelector}
        course={draggedCourse}
        slot={selectedSlot}
        rooms={rooms}
        onSelect={handleRoomSelect}
        onClose={() => {
          setShowRoomSelector(false);
          setDraggedCourse(null);
          setSelectedSlot(null);
        }}
        isLoading={isScheduling}
        error={schedulingError}
      />
    </div>
  );
};

export default ManualScheduler;
