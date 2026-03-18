import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Clock, Users, BookOpen, Trash2, AlertTriangle } from "lucide-react";
import { useCourses, type Course } from "../context/CoursesContext";
import { useAuth } from "../context/AuthContext";
import RoomSelector from "../components/RoomSelector";
import schedulingService from "../services/schedulingService";
import type {
  ManualSchedulingAction,
  ManualSchedulingRequest,
} from "../services/schedulingService";
import type { Slot } from "../services/schedulingService";
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

const toFullDayName = (day: string): string => {
  // Strip trailing numbers first (e.g., "Monday1" → "Monday")
  const dayWithoutNumber = day.replace(/\d+$/, "");
  // If it's already a full name, return it without numbers
  if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].includes(dayWithoutNumber)) {
    return dayWithoutNumber;
  }
  // Otherwise try to convert from short form
  return DAY_FULL[day] ?? day;
};

// Map full day names to short form and strip any trailing numbers
const toShortDayName = (day: string): string => {
  // Strip trailing numbers (e.g., "Monday1" → "Monday")
  const dayWithoutNumber = day.replace(/\d+$/, "");

  const fullToShort: Record<string, string> = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
  };
  return fullToShort[dayWithoutNumber] ?? day;
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

type DragSource = {
  day: string;
  startTime: string;
  endTime: string;
  roomNumber?: string;
};

const ManualScheduler = () => {
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refetch,
  } = useCourses();
  const { userRole } = useAuth();
  const [displayCourses, setDisplayCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [schedulingSuccess, setSchedulingSuccess] = useState<string | null>(
    null,
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [draggedFromScheduled, setDraggedFromScheduled] = useState(false);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [roomSelectorCourse, setRoomSelectorCourse] = useState<Course | null>(
    null,
  );
  const [roomSelectorIsReplace, setRoomSelectorIsReplace] = useState(false);
  const [roomSelectorSource, setRoomSelectorSource] =
    useState<DragSource | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [deletingSlotInfo, setDeletingSlotInfo] = useState<{
    day: string;
    startTime: string;
    endTime: string;
    roomNumber?: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setDisplayCourses(courses);
  }, [courses]);

  // Fetch slots on mount (rooms endpoint is optional in this deployment)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setSlotsLoading(true);
        const slotsData = await schedulingService.getAllSlots();
        setSlots(slotsData);
      } catch (err) {
        console.warn("Failed to fetch slots:", err);
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get unscheduled courses (no timeslots)
  const unscheduledCourses = displayCourses.filter(
    (course) => !course.timeslots || course.timeslots.length === 0,
  );

  // Get scheduled courses (have timeslots)
  const scheduledCourses = displayCourses.filter(
    (course) => course.timeslots && course.timeslots.length > 0,
  );

  // Debug: Log scheduled courses to see their format
  useEffect(() => {
    if (scheduledCourses.length > 0) {
      console.log("📅 Scheduled courses:", scheduledCourses.length);
      console.log("📅 First scheduled course:", scheduledCourses[0]);
      console.log("📅 First timeslot:", scheduledCourses[0]?.timeslots?.[0]);
    }
  }, [scheduledCourses]);

  const validateManualSchedulingInput = (
    actionType: ManualSchedulingAction,
    data: ManualSchedulingRequest,
  ) => {
    if (!data.courseId) {
      throw new Error("courseId is required");
    }

    if (actionType === "DELETE") {
      if (!data.prevDay || !data.prevStartTime || !data.prevEndTime) {
        throw new Error("prevDay, prevStartTime and prevEndTime are required for delete");
      }
      return;
    }

    if (!data.day || !data.startTime || !data.endTime || !data.roomNumber) {
      throw new Error("day, startTime, endTime and roomNumber are required");
    }

    if (actionType === "REPLACE") {
      if (!data.prevDay || !data.prevStartTime || !data.prevEndTime) {
        throw new Error(
          "prevDay, prevStartTime and prevEndTime are required for replace",
        );
      }

      const isSameSlot =
        data.day === data.prevDay &&
        data.startTime === data.prevStartTime &&
        data.endTime === data.prevEndTime &&
        (!data.prevRoomNumber || data.roomNumber === data.prevRoomNumber);

      if (isSameSlot) {
        throw new Error("Cannot move a course to the same slot");
      }
    }
  };

  const applyOptimisticCourseUpdate = useCallback(
    (
      currentCourses: Course[],
      actionType: ManualSchedulingAction,
      data: ManualSchedulingRequest,
    ) => {
      return currentCourses.map((course) => {
        if (course.courseId !== data.courseId) {
          return course;
        }

        if (actionType === "DELETE") {
          // Remove only the specific slot, not all slots
          const filteredTimeslots = course.timeslots?.filter(
            (slot) =>
              !(
                toShortDayName(slot.day) === toShortDayName(data.prevDay || "") &&
                slot.startTime === data.prevStartTime &&
                slot.endTime === data.prevEndTime
              )
          ) || [];

          return {
            ...course,
            room: filteredTimeslots.length === 0 ? [] : course.room,
            timeslots: filteredTimeslots,
          };
        }

        const updatedTimeslot = {
          day: data.day!,
          startTime: data.startTime!,
          endTime: data.endTime!,
          _id: `${data.day}-${data.startTime}-${data.endTime}`,
        };

        if (actionType === "ADD") {
          return {
            ...course,
            room: [data.roomNumber!],
            timeslots: [updatedTimeslot],
          };
        }

        const replacedTimeslots = course.timeslots?.length
          ? course.timeslots.map((timeslot) => {
              const isSourceSlot =
                timeslot.day === data.prevDay &&
                timeslot.startTime === data.prevStartTime &&
                timeslot.endTime === data.prevEndTime;

              return isSourceSlot ? updatedTimeslot : timeslot;
            })
          : [updatedTimeslot];

        const sourceSlotFound = replacedTimeslots.some(
          (timeslot) =>
            timeslot.day === data.day &&
            timeslot.startTime === data.startTime &&
            timeslot.endTime === data.endTime,
        );

        return {
          ...course,
          room: [data.roomNumber!],
          timeslots: sourceSlotFound
            ? replacedTimeslots
            : [...replacedTimeslots, updatedTimeslot],
        };
      });
    },
    [],
  );

  const handleManualScheduling = useCallback(
    async (
      actionType: ManualSchedulingAction,
      data: ManualSchedulingRequest,
      successMessage: string,
    ) => {
      validateManualSchedulingInput(actionType, data);
      const previousCourses = displayCourses;

      setIsScheduling(true);
      setSchedulingError(null);
      setSchedulingSuccess(null);
      setDisplayCourses((current) =>
        applyOptimisticCourseUpdate(current, actionType, data),
      );

      try {
        await schedulingService.handleManualScheduling(actionType, data);

        setSchedulingSuccess(successMessage);
        await refetch();
        return true;
      } catch (err) {
        setDisplayCourses(previousCourses);
        setSchedulingError(
          err instanceof Error
            ? err.message
            : `Failed to ${actionType.toLowerCase()} course`,
        );
        return false;
      } finally {
        setIsScheduling(false);
      }
    },
    [applyOptimisticCourseUpdate, displayCourses, refetch],
  );

  const handleDeleteCourseConfirm = async () => {
    if (!deletingCourseId || !deletingSlotInfo) return;

    const wasSuccessful = await handleManualScheduling(
      "DELETE",
      {
        courseId: deletingCourseId,
        prevDay: toFullDayName(deletingSlotInfo.day),
        prevStartTime: deletingSlotInfo.startTime,
        prevEndTime: deletingSlotInfo.endTime,
        prevRoomNumber: deletingSlotInfo.roomNumber,
      },
      "Course slot removed successfully!",
    );

    if (wasSuccessful) {
      setShowDeleteConfirm(false);
      setDeletingCourseId(null);
      setDeletingSlotInfo(null);
    }
  };

  // Get unique timeslots from slots API or from scheduled courses
  const getUniqueTimeslots = useCallback((): {
    startTime: string;
    endTime: string;
  }[] => {
    const seen = new Map<string, { startTime: string; endTime: string }>();

    // Try to get from slots API first
    if (slots.length > 0) {
      slots.forEach((slot) => {
        const key = `${slot.startTime}|${slot.endTime}`;
        if (!seen.has(key)) {
          seen.set(key, { startTime: slot.startTime, endTime: slot.endTime });
        }
      });
    } else {
      // If no slots from API, extract from scheduled courses
      scheduledCourses.forEach((course) => {
        course.timeslots?.forEach((timeslot) => {
          const key = `${timeslot.startTime}|${timeslot.endTime}`;
          if (!seen.has(key)) {
            seen.set(key, {
              startTime: timeslot.startTime,
              endTime: timeslot.endTime,
            });
          }
        });
      });
    }

    return Array.from(seen.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }, [slots, scheduledCourses]);

  // Get slot for a specific day and time
  const getSlotForDayTime = useCallback(
    (day: string, startTime: string, endTime: string): Slot | null => {
      console.log("🔍 getSlotForDayTime called:", { day, startTime, endTime });
      console.log("🔍 Total slots available:", slots.length);

      // Try to find in slots API first
      if (slots.length > 0) {
        const matchingSlot = slots.find((slot) => {
          // Normalize slot day names and check if any match the target day
          const normalizedSlotDays = slot.days.map(toShortDayName);
          const matches = (
            normalizedSlotDays.includes(day) &&
            slot.startTime === startTime &&
            slot.endTime === endTime
          );

          if (matches) {
            console.log("✅ Found matching slot:", slot);
          }

          return matches;
        });

        if (matchingSlot) {
          return matchingSlot;
        } else {
          console.log("⚠️ No matching slot found, creating mock slot");
        }
      }

      // If no slots from API or no match found, create a mock slot for drag-drop to work
      const mockSlot = {
        _id: `${day}-${startTime}-${endTime}`,
        code: `${day}-${startTime}`,
        credit: 3, // Default credit
        days: [day],
        startTime,
        endTime,
        timings: [`${startTime}-${endTime}`],
      };
      console.log("🔧 Returning mock slot:", mockSlot);
      return mockSlot;
    },
    [slots],
  );

  const handleDragStart = (course: Course) => {
    console.log("🎯 Dragging FROM UNSCHEDULED:", course.courseId);
    setDraggedCourse(course);
    setDraggedFromScheduled(false);
    setDragSource(null);
    setSchedulingError(null);
    setSchedulingSuccess(null);
  };

  const handleDragStartFromScheduled = (
    course: Course,
    day: string,
    startTime: string,
    endTime: string,
  ) => {
    console.log("🎯 Dragging FROM SCHEDULED:", course.courseId, "from", { day, startTime, endTime });
    setDraggedCourse(course);
    setDraggedFromScheduled(true);
    const roomNumber = course.room.length > 0 ? course.room[0] : undefined;
    setDragSource({ day, startTime, endTime, roomNumber });
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

    console.log("📍 DROP EVENT:", { day, startTime, endTime, draggedCourseId: draggedCourse?.courseId });

    if (!draggedCourse) {
      console.warn("❌ No draggedCourse - returning");
      return;
    }

    // Prevent dropping on the same slot for REPLACE operations
    if (
      draggedFromScheduled &&
      dragSource &&
      dragSource.day === day &&
      dragSource.startTime === startTime &&
      dragSource.endTime === endTime
    ) {
      console.warn("⚠️ Same slot - showing error");
      setSchedulingError("Cannot drop course on the same slot");
      return;
    }

    const slot = getSlotForDayTime(day, startTime, endTime);
    console.log("📌 Slot found:", slot);

    if (!slot) {
      console.error("❌ No slot found for this day and time");
      setSchedulingError("No slot found for this day and time");
      return;
    }

    console.log("✅ Setting selectedSlot and showing modal");
    console.log("State before update:", { showRoomSelector, selectedSlot });
    setSelectedSlot(slot);
    setRoomSelectorCourse(draggedCourse);
    setRoomSelectorIsReplace(draggedFromScheduled);
    setRoomSelectorSource(dragSource);
    setShowRoomSelector(true);
    console.log("State after update should show modal");
  };

  const handleRoomSelect = async (roomNumber: string) => {
    console.log("[handleRoomSelect] roomNumber:", roomNumber);
    console.log("[handleRoomSelect] roomSelectorCourse:", roomSelectorCourse?.courseId);
    console.log("[handleRoomSelect] selectedSlot:", selectedSlot);
    console.log("[handleRoomSelect] roomSelectorIsReplace:", roomSelectorIsReplace);
    console.log("[handleRoomSelect] roomSelectorSource:", roomSelectorSource);
    
    if (!roomSelectorCourse || !selectedSlot) return;

    const destinationDayRaw = selectedSlot.days[0];

    if (!destinationDayRaw) {
      setSchedulingError("Invalid destination slot");
      return;
    }

    const destinationDay = toFullDayName(destinationDayRaw);

    if (roomSelectorIsReplace && roomSelectorSource) {
      const previousDay = toFullDayName(roomSelectorSource.day);
      
      const replacePayload = {
        courseId: roomSelectorCourse.courseId,
        day: destinationDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        roomNumber,
        prevDay: previousDay,
        prevStartTime: roomSelectorSource.startTime,
        prevEndTime: roomSelectorSource.endTime,
        prevRoomNumber: roomSelectorSource.roomNumber,
      };
      
      console.log("[handleRoomSelect] REPLACE payload about to send:", replacePayload);
      
      const wasSuccessful = await handleManualScheduling(
        "REPLACE",
        {
          courseId: roomSelectorCourse.courseId,
          day: destinationDay,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          roomNumber,
          prevDay: previousDay,
          prevStartTime: roomSelectorSource.startTime,
          prevEndTime: roomSelectorSource.endTime,
          prevRoomNumber: roomSelectorSource.roomNumber,
        },
        `${roomSelectorCourse.courseId} moved successfully to Room ${roomNumber}!`,
      );

      if (!wasSuccessful) {
        return;
      }
    } else {
      const addPayload = {
        courseId: roomSelectorCourse.courseId,
        day: destinationDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        roomNumber,
      };
      
      console.log("[handleRoomSelect] ADD payload about to send:", addPayload);
      
      const wasSuccessful = await handleManualScheduling(
        "ADD",
        addPayload,
        `${roomSelectorCourse.courseId} scheduled successfully in Room ${roomNumber}!`,
      );

      if (!wasSuccessful) {
        return;
      }
    }

    setShowRoomSelector(false);
    setDraggedCourse(null);
    setDraggedFromScheduled(false);
    setDragSource(null);
    setSelectedSlot(null);
    setRoomSelectorCourse(null);
    setRoomSelectorIsReplace(false);
    setRoomSelectorSource(null);
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

  if (coursesError) {
    return (
      <div className="flex-1 flex flex-col bg-white p-4">
        <ErrorState
          error={coursesError || "Unknown error"}
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
          Drag courses to schedule. Drag from sidebar or from timetable cells
          to reschedule. Click the X button on scheduled courses to remove their slot.
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
        {/* Sidebar - Courses (Unscheduled and Scheduled) */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto flex flex-col flex-shrink-0">
          {/* Unscheduled Courses Section */}
          <div className="border-b border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <h2 className="font-semibold text-gray-900">Unscheduled Courses</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {unscheduledCourses.length} course
                {unscheduledCourses.length !== 1 ? "s" : ""}
              </p>
            </div>

            {coursesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : unscheduledCourses.length === 0 ? (
              <div className="flex items-center justify-center p-4 h-32">
                <div className="text-center text-gray-400">
                  <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <div className="text-xs font-medium">No unscheduled</div>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto p-3">
                {unscheduledCourses.map((course) => {
                  const colors =
                    COURSE_TYPE_COLORS[course.courseType] ?? DEFAULT_COLORS;
                  const isBeingDragged =
                    draggedCourse?.courseId === course.courseId &&
                    !draggedFromScheduled;

                  return (
                    <div
                      key={course._id}
                      draggable
                      onDragStart={() => handleDragStart(course)}
                      onDragEnd={() => {
                        setDraggedCourse(null);
                        setDraggedFromScheduled(false);
                      }}
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

          {/* Scheduled Courses Section */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-gray-200 bg-blue-50 sticky top-0 z-10">
              <h2 className="font-semibold text-gray-900">Scheduled Courses</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {scheduledCourses.length} course
                {scheduledCourses.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-500 mt-1 italic">
                Drag to move or click to remove slot
              </p>
            </div>

            {coursesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : scheduledCourses.length === 0 ? (
              <div className="flex items-center justify-center flex-1 p-4">
                <div className="text-center text-gray-400">
                  <Clock className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <div className="text-xs font-medium">No scheduled</div>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto p-3">
                {scheduledCourses.map((course) => {
                  const colors =
                    COURSE_TYPE_COLORS[course.courseType] ?? DEFAULT_COLORS;
                  const isBeingDragged =
                    draggedCourse?.courseId === course.courseId &&
                    draggedFromScheduled;

                  // Get first timeslot info
                  const firstSlot = course.timeslots[0];

                  return (
                    <div
                      key={course._id}
                      className={`p-3 rounded-lg border-2 mb-2 transition-all group ${
                        isBeingDragged
                          ? "opacity-50 scale-95"
                          : `${colors.bg} ${colors.border} hover:shadow-md`
                      }`}
                    >
                      {/* Make course draggable from scheduled panel */}
                      {firstSlot && (
                        <div
                          draggable
                          onDragStart={() =>
                            handleDragStartFromScheduled(
                              course,
                              firstSlot.day,
                              firstSlot.startTime,
                              firstSlot.endTime,
                            )
                          }
                          onDragEnd={() => {
                            setDraggedCourse(null);
                            setDraggedFromScheduled(false);
                          }}
                          className="cursor-move"
                        >
                          <div className="font-semibold text-gray-900 text-sm">
                            {course.courseId}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 truncate">
                            {course["Course Name"]}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {firstSlot.day} {firstSlot.startTime}–
                            {firstSlot.endTime}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setDeletingCourseId(course.courseId);
                          setDeletingSlotInfo({
                            day: firstSlot.day,
                            startTime: firstSlot.startTime,
                            endTime: firstSlot.endTime,
                            roomNumber: course.room.length > 0 ? course.room[0] : undefined,
                          });
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full mt-2 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                        Remove Slot
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main timetable area */}
        <div className="flex-1 overflow-y-auto p-4">
          {slotsLoading ? (
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
                      {DAYS.map((day) => {
                        // Get courses scheduled for this slot
                        // Normalize day names for comparison (support both "Mon" and "Monday")
                        const coursesInSlot = scheduledCourses.filter((course) => {
                          return course.timeslots?.some(
                            (slot) =>
                              (toShortDayName(slot.day) === day || slot.day === day) &&
                              slot.startTime === startTime &&
                              slot.endTime === endTime
                          );
                        });

                        return (
                          <td
                            key={day}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) =>
                              handleDropOnSlot(e, day, startTime, endTime)
                            }
                            className="border-b border-r border-gray-200 px-2 py-3 align-top min-h-24 border-dashed transition-colors cursor-drop"
                          >
                            {coursesInSlot.length > 0 ? (
                              <div className="space-y-1">
                                {coursesInSlot.map((course) => {
                                  const colors =
                                    COURSE_TYPE_COLORS[course.courseType] ??
                                    DEFAULT_COLORS;
                                  return (
                                    <div
                                      key={course._id}
                                      className={`relative group p-2 rounded text-xs font-semibold cursor-move ${colors.bg} ${colors.border} border-2 hover:shadow-md transition-shadow`}
                                      draggable
                                      onDragStart={() =>
                                        handleDragStartFromScheduled(
                                          course,
                                          day,
                                          startTime,
                                          endTime,
                                        )
                                      }
                                      onDragEnd={() => {
                                        setDraggedCourse(null);
                                        setDraggedFromScheduled(false);
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span>{course.courseId}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingCourseId(course.courseId);
                                            setDeletingSlotInfo({
                                              day,
                                              startTime,
                                              endTime,
                                              roomNumber: course.room.length > 0 ? course.room[0] : undefined,
                                            });
                                            setShowDeleteConfirm(true);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded p-0.5"
                                          title="Remove slot"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 text-center py-8">
                                Drop course here
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
      </div>

      {/* Room Selector Modal */}
      <RoomSelector
        isOpen={showRoomSelector}
        course={roomSelectorCourse}
        slot={selectedSlot}
        rooms={[]}
        onSelect={handleRoomSelect}
        onClose={() => {
          setShowRoomSelector(false);
          setDraggedCourse(null);
          setDraggedFromScheduled(false);
          setDragSource(null);
          setSelectedSlot(null);
          setRoomSelectorCourse(null);
          setRoomSelectorIsReplace(false);
          setRoomSelectorSource(null);
        }}
        isLoading={isScheduling}
        error={schedulingError}
        isReplace={roomSelectorIsReplace}
        sourceSlot={roomSelectorSource}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingCourseId && deletingSlotInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-gray-200 bg-red-50">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Remove Slot?
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to remove the time slot for{" "}
                  <strong>{deletingCourseId}</strong>
                  {deletingSlotInfo && (
                    <> ({deletingSlotInfo.day} {deletingSlotInfo.startTime}–{deletingSlotInfo.endTime})</>
                  )}
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingCourseId(null);
                  setDeletingSlotInfo(null);
                }}
                disabled={isScheduling}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourseConfirm}
                disabled={isScheduling}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScheduling ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualScheduler;
