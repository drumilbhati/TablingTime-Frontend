import { type Course, getCourseCredit } from "../context/CoursesContext";

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

const formatRooms = (rooms: any[]) => {
  if (!rooms || rooms.length === 0) return "";
  const valid = rooms
    .map((r) => {
      if (typeof r === "string") return r === "[object Object]" ? "" : r;
      if (r && typeof r === "object") {
        const roomName = r.roomNumber || r.name || r._id || "";
        if (r.building && roomName) {
          return `${r.building} - ${roomName}`;
        }
        return roomName;
      }
      return String(r);
    })
    .filter(Boolean);
  return Array.from(new Set(valid)).join(", ");
};

export interface CourseDetailsModalProps {
  course: Course;
  day: string;
  startTime: string;
  endTime: string;
  isSelected: boolean;
  onClose: () => void;
}

export const CourseDetailsModal = ({
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
              <div className="text-sm font-semibold text-gray-800 mt-1 min-h-[1.25rem]">
                {course.Faculty || "—"}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 font-medium uppercase">
                Credits
              </div>
              <div className="text-sm font-semibold text-gray-800 mt-1 min-h-[1.25rem]">
                {getCourseCredit(course) || "—"}
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
                {formatRooms(course.room) || "—"}
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
