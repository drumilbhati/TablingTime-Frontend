import { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Clock, Users, BookOpen, Trash2, AlertTriangle, Upload, Search } from "lucide-react";
import { useCourses, type Course } from "../context/CoursesContext";
import { useAuth } from "../context/AuthContext";
import RoomSelector from "../components/RoomSelector";
import { CourseDetailsModal } from "../components/CourseDetailsModal";
import schedulingService from "../services/schedulingService";
import type {
  ManualSchedulingAction,
  ManualSchedulingRequest,
} from "../services/schedulingService";
import type { CourseCategory, ProfessorPreferenceMode } from "../services/schedulingService";
import type { Slot } from "../services/schedulingService";
import ErrorState from "../components/ErrorState";
import PartialTimetableUploadModal from "../components/PartialTimetableUploadModal";

type SchedulerStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_LABELS: Record<CourseCategory, string> = {
  GER: "GER",
  CORE: "CORE",
  ELECTIVE: "Elective",
};
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

const normalizeDayToken = (value: string): string => value.replace(/\d+$/, "").toLowerCase();

const toHalfHourValue = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) + ((minutes || 0) === 30 ? 0.5 : 0);
};

const getDynamicSlotCodes = (day: string, startTime: string, endTime: string): string[] => {
  const dayPrefixes: Record<string, string> = {
    Monday: "M",
    Tuesday: "Tu",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "F",
    Saturday: "Sa",
    Mon: "M",
    Tue: "Tu",
    Wed: "W",
    Thu: "Th",
    Fri: "F",
    Sat: "Sa",
  };

  const fullDay = toFullDayName(day);
  const prefix = dayPrefixes[fullDay] ?? dayPrefixes[day];
  if (!prefix) return [];

  const start = toHalfHourValue(startTime);
  const end = toHalfHourValue(endTime);
  if (start >= end) return [];

  const codes: string[] = [];
  let current = start;
  while (current < end - 0.1) {
    const slotIndex = Math.round((current - 8.0) / 0.5) + 1;
    codes.push(`${prefix}${slotIndex}`);
    current += 0.5;
  }

  return codes;
};

const formatRoomDisplay = (room: string | { roomNumber?: string; building?: string } | undefined): string => {
  if (!room) return "";
  if (typeof room === "string") return room;
  const roomName = room.roomNumber || "";
  if (room.building && roomName) return `${room.building} - ${roomName}`;
  return roomName;
};

const getRoomNumberForSlot = (
  course: Course,
  day: string,
  startTime: string,
  endTime: string,
): string | undefined => {
  if (!course.room?.length) return undefined;

  const targetDayShort = normalizeDayToken(toShortDayName(day));
  const targetDayFull = normalizeDayToken(toFullDayName(day));

  const structuredAssignments = course.room.filter(
    (room): room is { roomNumber?: string; building?: string; slot?: string } =>
      typeof room === "object" && room !== null,
  );

  const matchedAssignment = structuredAssignments.find((room) => {
    const slot = String(room.slot ?? "").toLowerCase();
    if (!slot) return false;

    const dayMatches =
      slot.includes(targetDayShort) || slot.includes(targetDayFull);
    const timeMatches = slot.includes(startTime) && slot.includes(endTime);

    return dayMatches && timeMatches;
  });

  if (matchedAssignment?.roomNumber) {
    return String(matchedAssignment.roomNumber);
  }

  const dynamicSlots = getDynamicSlotCodes(day, startTime, endTime);
  if (dynamicSlots.length > 0) {
    const dynamicMatch = structuredAssignments.find((room) =>
      dynamicSlots.includes(String(room.slot ?? "")),
    );

    if (dynamicMatch?.roomNumber) {
      return String(dynamicMatch.roomNumber);
    }
  }

  if (structuredAssignments.length === 1 && structuredAssignments[0]?.roomNumber) {
    return String(structuredAssignments[0].roomNumber);
  }

  const firstRoomWithNumber = structuredAssignments.find((room) => room.roomNumber);
  if (firstRoomWithNumber?.roomNumber) {
    return String(firstRoomWithNumber.roomNumber);
  }

  const legacyStringRoom = course.room.find(
    (room): room is string => typeof room === "string" && room.trim().length > 0,
  );
  if (legacyStringRoom) {
    return legacyStringRoom;
  }

  return undefined;
};

const getNumericCredit = (value: string | number | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getExpectedComponentCount = (course: Course): number => {
  const theoryCredits = getNumericCredit(course.theoryCredits);
  const labCredits = getNumericCredit(course.labCredits);
  const componentCount =
    (theoryCredits > 0 ? 1 : 0) + (labCredits > 0 ? 1 : 0);

  return componentCount > 0 ? componentCount : 1;
};

const getScheduledComponentCount = (course: Course): number => {
  if (!course.timeslots?.length) return 0;

  // Theory/lab components are typically assigned as separate slot windows.
  return new Set(
    course.timeslots.map((slot) => `${slot.startTime}|${slot.endTime}`),
  ).size;
};

const getCourseScheduleState = (
  course: Course,
): "unscheduled" | "partial" | "scheduled" => {
  if (!course.timeslots?.length) {
    return "unscheduled";
  }

  const expectedComponents = getExpectedComponentCount(course);
  const scheduledComponents = getScheduledComponentCount(course);

  if (expectedComponents > 1 && scheduledComponents < expectedComponents) {
    return "partial";
  }

  return "scheduled";
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
  const [status, setStatus] = useState<SchedulerStatus>({ type: "idle" });
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [schedulingSuccess, setSchedulingSuccess] = useState<string | null>(
    null,
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [draggedFromScheduled, setDraggedFromScheduled] = useState(false);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDropDay, setSelectedDropDay] = useState<string | null>(null);
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
  const [showPartialUploadDialog, setShowPartialUploadDialog] = useState(false);
  const [priorityOrder, setPriorityOrder] = useState<CourseCategory[]>([
    "GER",
    "CORE",
    "ELECTIVE",
  ]);
  const [professorPreferenceMode, setProfessorPreferenceMode] =
    useState<ProfessorPreferenceMode>("strict");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCourseDetails, setActiveCourseDetails] = useState<{
    course: Course;
    day: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const movePriority = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= priorityOrder.length) return;

    const nextOrder = [...priorityOrder];
    [nextOrder[index], nextOrder[targetIndex]] = [
      nextOrder[targetIndex],
      nextOrder[index],
    ];
    setPriorityOrder(nextOrder);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;

    if (tableContainerRef.current) {
      const scrollableDiv = tableContainerRef.current;
      const rect = scrollableDiv.getBoundingClientRect();
      const threshold = 80;
      const scrollAmount = 15;

      if (e.clientX > rect.right - threshold) {
        scrollableDiv.scrollLeft += scrollAmount;
      } else if (e.clientX < rect.left + threshold) {
        scrollableDiv.scrollLeft -= scrollAmount;
      }

      if (e.clientY > rect.bottom - threshold) {
        scrollableDiv.scrollTop += scrollAmount;
      } else if (e.clientY < rect.top + threshold) {
        scrollableDiv.scrollTop -= scrollAmount;
      }
    }
  }, []);

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

  const handleAutoSchedule = async () => {
    setStatus({ type: "loading" });

    try {
      await schedulingService.runAutoScheduler({
        priorityOrder,
        professorPreferenceMode,
      });

      await refetch();
      setStatus({
        type: "success",
        message: "Scheduling completed successfully with selected priority settings.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  const filteredCourses = displayCourses.filter((course) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      course.courseId.toLowerCase().includes(searchLower) ||
      (course["Course Name"] &&
        course["Course Name"].toLowerCase().includes(searchLower)) ||
      (course.Professor &&
        course.Professor.toLowerCase().includes(searchLower))
    );
  });

  const unscheduledCourses = filteredCourses.filter(
    (course) => getCourseScheduleState(course) === "unscheduled",
  );

  const partiallyScheduledCourses = filteredCourses.filter(
    (course) => getCourseScheduleState(course) === "partial",
  );

  const scheduledCourses = filteredCourses.filter(
    (course) => getCourseScheduleState(course) === "scheduled",
  );

  const coursesWithAssignedSlots = displayCourses.filter(
    (course) => getCourseScheduleState(course) !== "unscheduled",
  );

  // Debug: Log scheduled courses to see their format
  useEffect(() => {
    if (coursesWithAssignedSlots.length > 0) {
      console.log("📅 Courses with assigned slots:", coursesWithAssignedSlots.length);
      console.log("📅 First assigned course:", coursesWithAssignedSlots[0]);
      console.log("📅 First timeslot:", coursesWithAssignedSlots[0]?.timeslots?.[0]);
    }
  }, [coursesWithAssignedSlots]);

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

    const sourceCourse = displayCourses.find((course) => course.courseId === deletingCourseId);
    const resolvedRoomNumber =
      deletingSlotInfo.roomNumber ||
      (sourceCourse
        ? getRoomNumberForSlot(
            sourceCourse,
            deletingSlotInfo.day,
            deletingSlotInfo.startTime,
            deletingSlotInfo.endTime,
          )
        : undefined);

    if (!resolvedRoomNumber) {
      setSchedulingError("Could not resolve room number for this slot. Please refresh and try again.");
      return;
    }

    const wasSuccessful = await handleManualScheduling(
      "DELETE",
      {
        courseId: deletingCourseId,
        prevDay: toFullDayName(deletingSlotInfo.day),
        prevStartTime: deletingSlotInfo.startTime,
        prevEndTime: deletingSlotInfo.endTime,
        prevRoomNumber: resolvedRoomNumber,
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
      // If no slots from API, extract from courses with assigned slots
      coursesWithAssignedSlots.forEach((course) => {
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
  }, [slots, coursesWithAssignedSlots]);

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

  const handleCourseClick = (course: Course, day: string, startTime: string, endTime: string) => {
    if (isDragging.current) return;
    setActiveCourseDetails({ course, day, startTime, endTime });
  };

  const handleDragStart = (course: Course) => {
    console.log("🎯 Dragging FROM UNSCHEDULED:", course.courseId);
    isDragging.current = true;
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
    isDragging.current = true;
    setDraggedCourse(course);
    setDraggedFromScheduled(true);
    const roomNumber = getRoomNumberForSlot(course, day, startTime, endTime);
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
    setSelectedDropDay(day);
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

    const destinationDayRaw = selectedDropDay ?? selectedSlot.days[0];

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
        `${roomSelectorCourse.courseId} moved successfully to ${roomNumber}!`,
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
        `${roomSelectorCourse.courseId} scheduled successfully in ${roomNumber}!`,
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
    setSelectedDropDay(null);
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
    <div className="flex flex-col min-h-[calc(100svh-73px)] bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduler</h1>
          <p className="text-sm text-gray-600 mt-1">
            Drag courses to manually schedule. Configure priority and professor constraint handling before auto scheduling.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPartialUploadDialog(true)}
            disabled={status.type === "loading" || isScheduling}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload size={14} />
            Partial Timetable
          </button>
          <button
            onClick={handleAutoSchedule}
            disabled={status.type === "loading" || isScheduling}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status.type === "loading" ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Upload size={14} />
                Auto Schedule
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Course Priority Order
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Scheduler will allocate categories in this order.
            </p>
            <div className="mt-3 space-y-2">
              {priorityOrder.map((category, index) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {index + 1}. {CATEGORY_LABELS[category]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => movePriority(index, "up")}
                      disabled={index === 0 || isScheduling || status.type === "loading"}
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => movePriority(index, "down")}
                      disabled={
                        index === priorityOrder.length - 1 ||
                        isScheduling ||
                        status.type === "loading"
                      }
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Professor Constraints Mode
            </h2>
            <p className="mt-1 text-xs text-gray-600">
              Choose how strictly professor preferences are enforced.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                <input
                  type="radio"
                  name="preferenceMode"
                  checked={professorPreferenceMode === "strict"}
                  onChange={() => setProfessorPreferenceMode("strict")}
                  disabled={isScheduling || status.type === "loading"}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Strict</span>: only preferred slots are used.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50">
                <input
                  type="radio"
                  name="preferenceMode"
                  checked={professorPreferenceMode === "last"}
                  onChange={() => setProfessorPreferenceMode("last")}
                  disabled={isScheduling || status.type === "loading"}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  <span className="font-medium text-gray-900">Fallback</span>: try preferred slots first, then fallback to any valid slot.
                </span>
              </label>
            </div>
          </div>
        </div>
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

      {status.type === "success" && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <div className="text-green-600 flex-shrink-0 mt-0.5">✓</div>
          <div>
            <p className="text-sm font-medium text-green-800">
              {status.message}
            </p>
          </div>
        </div>
      )}

      {status.type === "error" && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">
              {status.message}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar - Courses (Unscheduled and Scheduled) */}
        <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0 bg-white">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200 sticky top-0 z-20 bg-white">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search course ID, name..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Unscheduled Courses Section */}
          <div className="border-b border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
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
              <div className="p-3">
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
                      onDrag={handleDrag}
                      onDragEnd={() => {
                        isDragging.current = false;
                        setDraggedCourse(null);
                        setDraggedFromScheduled(false);
                      }}
                      className={`p-3 rounded-lg border-2 cursor-move mb-2 transition-all ${
                        isBeingDragged
                          ? "opacity-50 scale-95"
                          : `${colors.bg} ${colors.border} hover:shadow-md`
                      }`}
                      onClick={() => {
                        const firstSlot = course.timeslots?.find(s => s.day && s.startTime) || {
                          day: "Mon",
                          startTime: "08:00",
                          endTime: "09:30"
                        };
                        handleCourseClick(course, firstSlot.day, firstSlot.startTime, firstSlot.endTime);
                      }}
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

          {/* Partially Scheduled Courses Section */}
          <div className="border-b border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-amber-50 sticky top-0 z-10">
              <h2 className="font-semibold text-gray-900">Partially Scheduled</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {partiallyScheduledCourses.length} course
                {partiallyScheduledCourses.length !== 1 ? "s" : ""}
              </p>
            </div>

            {coursesLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : partiallyScheduledCourses.length === 0 ? (
              <div className="flex items-center justify-center p-4 h-28">
                <div className="text-center text-gray-400">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <div className="text-xs font-medium">No partial courses</div>
                </div>
              </div>
            ) : (
              <div className="p-3">
                {partiallyScheduledCourses.map((course) => {
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
                      onDrag={handleDrag}
                      onDragEnd={() => {
                        isDragging.current = false;
                        setDraggedCourse(null);
                        setDraggedFromScheduled(false);
                      }}
                      className={`p-3 rounded-lg border-2 cursor-move mb-2 transition-all ${
                        isBeingDragged
                          ? "opacity-50 scale-95"
                          : `${colors.bg} ${colors.border} hover:shadow-md`
                      }`}
                      onClick={() => {
                        const firstSlot = course.timeslots?.find(s => s.day && s.startTime) || {
                          day: "Mon",
                          startTime: "08:00",
                          endTime: "09:30"
                        };
                        handleCourseClick(course, firstSlot.day, firstSlot.startTime, firstSlot.endTime);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-gray-900 text-sm">
                          {course.courseId}
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Partial
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {course["Course Name"]}
                      </div>
                      <div className="text-xs text-amber-700 mt-1">
                        {course.timeslots.length} slot
                        {course.timeslots.length !== 1 ? "s" : ""} assigned
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
          <div className="flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 bg-blue-50">
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
              <div className="p-3">
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
                          onDrag={handleDrag}
                          onDragEnd={() => {
                            isDragging.current = false;
                            setDraggedCourse(null);
                            setDraggedFromScheduled(false);
                          }}
                          className="cursor-move"
                          onClick={() => handleCourseClick(course, firstSlot.day, firstSlot.startTime, firstSlot.endTime)}
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
                            roomNumber: getRoomNumberForSlot(
                              course,
                              firstSlot.day,
                              firstSlot.startTime,
                              firstSlot.endTime,
                            ),
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
        <div className="flex-1 p-4 min-w-0">
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
            <div
              ref={tableContainerRef}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto"
            >
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
                        const coursesInSlot = coursesWithAssignedSlots.filter((course) => {
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
                                        isDragging.current = false;
                                        setDraggedCourse(null);
                                        setDraggedFromScheduled(false);
                                      }}
                                      onClick={() => handleCourseClick(course, day, startTime, endTime)}
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
                                              roomNumber: getRoomNumberForSlot(
                                                course,
                                                day,
                                                startTime,
                                                endTime,
                                              ),
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

      {/* Partial Timetable Upload Modal */}
      {showPartialUploadDialog && (
        <PartialTimetableUploadModal
          onClose={() => setShowPartialUploadDialog(false)}
          onSuccess={() => {
            setShowPartialUploadDialog(false);
            refetch();
          }}
        />
      )}

      {/* Course Detail Modal */}
      {activeCourseDetails && (
        <CourseDetailsModal
          course={activeCourseDetails.course}
          day={activeCourseDetails.day}
          startTime={activeCourseDetails.startTime}
          endTime={activeCourseDetails.endTime}
          isSelected={false}
          onClose={() => setActiveCourseDetails(null)}
        />
      )}
    </div>
  );
};

export default ManualScheduler;
