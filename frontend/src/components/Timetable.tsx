import { useState } from "react";
import { useCourses, type Course } from "../context/CoursesContext";
import ErrorState from "./ErrorState";

interface TimetableProps {
  selectedCourse: string | null;
}

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
  { bg: string; border: string; text: string; selectedBg: string }
> = {
  CORE: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    selectedBg: "bg-blue-600",
  },
  ELECTIVE: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    selectedBg: "bg-purple-600",
  },
  LAB: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    selectedBg: "bg-green-600",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-50",
  border: "border-gray-200",
  text: "text-gray-700",
  selectedBg: "bg-gray-700",
};

interface CourseDetailsModalProps {
  course: Course;
  day: string;
  startTime: string;
  endTime: string;
  isSelected: boolean;
  onClose: () => void;
}

const CourseDetailsModal = ({
  course,
  day,
  startTime,
  endTime,
  isSelected,
  onClose,
}: CourseDetailsModalProps) => {
  const colors = COURSE_TYPE_COLORS[course.courseType] ?? DEFAULT_COLORS;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-start p-5 rounded-t-xl border-b border-gray-100 ${
            isSelected ? colors.selectedBg : colors.bg
          }`}
        >
          <div>
            <div
              className={`eyebrow-label mb-1 ${
                isSelected ? "text-white/70" : colors.text
              }`}
            >
              {course.courseType}
            </div>
            <h3
              className={`panel-title ${
                isSelected ? "text-white" : "text-gray-900"
              }`}
            >
              {course.courseId}
            </h3>
            <p
              className={`text-sm mt-0.5 ${
                isSelected ? "text-white/80" : "text-gray-600"
              }`}
            >
              {course["Course Name"]}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-lg font-bold leading-none transition-colors ${
              isSelected
                ? "text-white/70 hover:text-white"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase">
                Faculty
              </div>
              <div className="text-sm font-semibold text-gray-800 mt-1">
                {course.Faculty}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase">
                Credits
              </div>
              <div className="text-sm font-semibold text-gray-800 mt-1">
                {course.Credits}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase">
                Students
              </div>
              <div className="text-sm font-semibold text-gray-800 mt-1">
                {course.studentId.length}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase">
                Room
              </div>
              <div className="text-sm font-semibold text-gray-800 mt-1">
                {course.room.length > 0 ? course.room.join(", ") : "—"}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 font-medium uppercase mb-1">
              Timeslot
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {DAY_FULL[day] ?? day} &mdash; {startTime} to {endTime}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 font-medium uppercase mb-2">
              All scheduled slots
            </div>
            <div className="flex flex-wrap gap-1.5">
              {course.timeslots.map((slot) => (
                <span
                  key={slot._id}
                  className={`text-xs px-2 py-1 rounded-md font-medium border ${
                    slot.day === day &&
                    slot.startTime === startTime &&
                    slot.endTime === endTime
                      ? `${colors.selectedBg} text-white border-transparent`
                      : `${colors.bg} ${colors.text} ${colors.border}`
                  }`}
                >
                  {slot.day} {slot.startTime}–{slot.endTime}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Timetable = ({ selectedCourse }: TimetableProps) => {
  const { courses, loading, error, refetch } = useCourses();
  const [activeModal, setActiveModal] = useState<{
    course: Course;
    day: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  // Build a sorted list of unique timeslot time-ranges across all courses
  const getUniqueTimeslots = (): { startTime: string; endTime: string }[] => {
    const seen = new Map<string, { startTime: string; endTime: string }>();
    courses.forEach((course) => {
      course.timeslots.forEach((slot) => {
        const key = `${slot.startTime}|${slot.endTime}`;
        if (!seen.has(key)) {
          seen.set(key, { startTime: slot.startTime, endTime: slot.endTime });
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  };

  // Get the course(s) scheduled at a specific day + timeslot
  const getCoursesAtSlot = (
    day: string,
    startTime: string,
    endTime: string,
  ): Course[] => {
    return courses.filter((course) =>
      course.timeslots.some(
        (slot) =>
          slot.day === day &&
          slot.startTime === startTime &&
          slot.endTime === endTime,
      ),
    );
  };

  const timeslots = getUniqueTimeslots();

  if (error) {
    return (
      <div className="flex-1 flex flex-col bg-white p-4">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white p-4">
      {loading ? (
        <div className="flex-1 flex flex-col gap-3">
          {/* Skeleton header */}
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      ) : timeslots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm font-medium">
              No timetable data available
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
                    className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-40"
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

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const cellCourses = getCoursesAtSlot(
                      day,
                      startTime,
                      endTime,
                    );

                    return (
                      <td
                        key={day}
                        className="border-b border-r border-gray-200 px-2 py-2 align-top min-h-18"
                      >
                        <div className="flex flex-col gap-1">
                          {cellCourses.map((course) => {
                            const isSelected =
                              selectedCourse === course.courseId;
                            const colors =
                              COURSE_TYPE_COLORS[course.courseType] ??
                              DEFAULT_COLORS;

                            return (
                              <button
                                key={course._id}
                                onClick={() =>
                                  setActiveModal({
                                    course,
                                    day,
                                    startTime,
                                    endTime,
                                  })
                                }
                                title={`${course.courseId} — ${course["Course Name"]}`}
                                className={`w-full text-left rounded-md border px-2 py-1.5 text-xs font-medium transition-all hover:shadow-md ${
                                  isSelected
                                    ? `${colors.selectedBg} text-white border-transparent shadow-sm`
                                    : `${colors.bg} ${colors.text} ${colors.border} hover:brightness-95`
                                }`}
                              >
                                <div className="font-semibold truncate">
                                  {course.courseId}
                                </div>
                                <div
                                  className={`truncate mt-0.5 ${
                                    isSelected ? "text-white/70" : "opacity-70"
                                  }`}
                                >
                                  {course["Course Name"]}
                                </div>
                                {course.room.length > 0 && (
                                  <div
                                    className={`mt-0.5 ${
                                      isSelected
                                        ? "text-white/60"
                                        : "opacity-50"
                                    }`}
                                  >
                                    🏫 {course.room.join(", ")}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {!loading && timeslots.length > 0 && (
        <div className="flex items-center gap-4 mt-3 px-1">
          <span className="text-xs text-gray-400 font-medium">Type:</span>
          {Object.entries(COURSE_TYPE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-sm border ${colors.bg} ${colors.border}`}
              />
              <span className="text-xs text-gray-500">{type}</span>
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            (Selected course is highlighted)
          </span>
        </div>
      )}

      {/* Course detail modal */}
      {activeModal && (
        <CourseDetailsModal
          course={activeModal.course}
          day={activeModal.day}
          startTime={activeModal.startTime}
          endTime={activeModal.endTime}
          isSelected={selectedCourse === activeModal.course.courseId}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};

export default Timetable;
