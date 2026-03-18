import { useState, useMemo, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import type { Course } from "../context/CoursesContext";
import type { Room, Slot } from "../services/schedulingService";

interface RoomSelectorProps {
  isOpen: boolean;
  course: Course | null;
  slot: Slot | null;
  rooms: Room[];
  onSelect: (roomNumber: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  isReplace?: boolean;
  sourceSlot?: { day: string; startTime: string; endTime: string } | null;
}

const RoomSelector = ({
  isOpen,
  course,
  slot,
  rooms,
  onSelect,
  onClose,
  isLoading = false,
  error = null,
  isReplace = false,
  sourceSlot = null,
}: RoomSelectorProps) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [manualRoomNumber, setManualRoomNumber] = useState("");

  const isReady = isOpen && !!course && !!slot;

  useEffect(() => {
    if (!isOpen) {
      setSelectedRoom(null);
      setManualRoomNumber("");
    }
  }, [isOpen]);

  const availableRooms = useMemo(() => {
    if (!course || !slot) {
      return [];
    }

    return rooms.filter((room) => {
      // Check capacity
      if (room.capacity < course.studentId.length) {
        return false;
      }

      // Check for schedule conflicts
      let hasConflict = false;
      for (const daySlot of slot.timings) {
        if (room.schedule.some((s) => s.timeSlot === daySlot)) {
          hasConflict = true;
          break;
        }
      }

      // Check for combined room conflicts (207/208 vs 207208)
      if (!hasConflict && room.roomNumber === "207208") {
        const room207 = rooms.find((r) => r.roomNumber === "207");
        const room208 = rooms.find((r) => r.roomNumber === "208");
        for (const daySlot of slot.timings) {
          if (
            (room207 && room207.schedule.some((s) => s.timeSlot === daySlot)) ||
            (room208 && room208.schedule.some((s) => s.timeSlot === daySlot))
          ) {
            hasConflict = true;
            break;
          }
        }
      } else if (
        !hasConflict &&
        (room.roomNumber === "207" || room.roomNumber === "208")
      ) {
        const roomCombined = rooms.find((r) => r.roomNumber === "207208");
        for (const daySlot of slot.timings) {
          if (
            roomCombined &&
            roomCombined.schedule.some((s) => s.timeSlot === daySlot)
          ) {
            hasConflict = true;
            break;
          }
        }
      }

      return !hasConflict;
    });
  }, [rooms, course, slot]);

  const unavailableRooms = useMemo(() => {
    return rooms.filter((room) => !availableRooms.includes(room));
  }, [rooms, availableRooms]);

  if (!isReady || !course || !slot) {
    return null;
  }

  const handleSelect = () => {
    const roomNumber = selectedRoom ?? manualRoomNumber.trim();
    if (roomNumber) {
      onSelect(roomNumber);
      setSelectedRoom(null);
      setManualRoomNumber("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isReplace ? "Move Course" : "Select a Room"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isReplace ? (
                <>
                  Move <strong>{course.courseId}</strong> to {slot.days.join(", ")}{" "}
                  from {slot.startTime} to {slot.endTime}
                  {sourceSlot && (
                    <>
                      <br />
                      <span className="text-xs">
                        From: {sourceSlot.day} {sourceSlot.startTime}–
                        {sourceSlot.endTime}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Choose a room for {course.courseId} on {slot.days.join(", ")} from{" "}
                  {slot.startTime} to {slot.endTime}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle
                className="text-red-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Course Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 font-medium uppercase">
                  Course
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {course.courseId}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {course["Course Name"]}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-medium uppercase">
                  Students Enrolled
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {course.studentId.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-medium uppercase">
                  Credits Required
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {course.Credits}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-medium uppercase">
                  Slot Code
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {slot.code}
                </div>
              </div>
            </div>
          </div>

          {/* Available Rooms */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Number</h3>

            {rooms.length === 0 ? (
              <div className="space-y-3">
                <div className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                  Rooms API is unavailable. Enter room number manually.
                </div>
                <input
                  value={manualRoomNumber}
                  onChange={(e) => {
                    setManualRoomNumber(e.target.value);
                    if (selectedRoom) {
                      setSelectedRoom(null);
                    }
                  }}
                  placeholder="e.g. 207"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {availableRooms.map((room) => (
                    <button
                      key={room._id}
                      onClick={() => {
                        setSelectedRoom(room.roomNumber);
                        setManualRoomNumber("");
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedRoom === room.roomNumber
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        Room {room.roomNumber}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Capacity: {room.capacity}
                      </div>
                      {course.studentId.length > 0 && (
                        <div className="text-xs text-green-600 mt-1 font-medium">
                          ✓ Fits {course.studentId.length} students
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Or enter room manually
                  </label>
                  <input
                    value={manualRoomNumber}
                    onChange={(e) => {
                      setManualRoomNumber(e.target.value);
                      if (selectedRoom) {
                        setSelectedRoom(null);
                      }
                    }}
                    placeholder="e.g. 207"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Unavailable Rooms */}
          {unavailableRooms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Unavailable Rooms ({unavailableRooms.length})
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {unavailableRooms.map((room) => {
                  const isCapacityIssue =
                    room.capacity < course.studentId.length;
                  const reason = isCapacityIssue
                    ? `Capacity ${room.capacity} < ${course.studentId.length} students`
                    : "Booked at this time";

                  return (
                    <div
                      key={room._id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-left opacity-60"
                      title={reason}
                    >
                      <div className="font-semibold text-gray-700">
                        Room {room.roomNumber}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Capacity: {room.capacity}
                      </div>
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        ✗ {reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={(!selectedRoom && !manualRoomNumber.trim()) || isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? isReplace
                ? "Moving..."
                : "Scheduling..."
              : isReplace
                ? "Move Course"
                : "Schedule Course"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSelector;
