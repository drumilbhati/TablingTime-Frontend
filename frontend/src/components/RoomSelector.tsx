import { useState, useMemo, useEffect } from "react";
import { X, AlertCircle, Building2, LayoutGrid } from "lucide-react";
import type { Course } from "../context/CoursesContext";
import schedulingService, { type Room, type Slot } from "../services/schedulingService";

interface RoomSelectorProps {
  isOpen: boolean;
  course: Course | null;
  slot: Slot | null;
  rooms: Room[]; // Kept for backward compatibility, but we fetch available rooms
  onSelect: (roomNumber: string) => void;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  isReplace?: boolean;
  sourceSlot?: { day: string; startTime: string; endTime: string } | null;
}

// Utility to generate slot codes from human-readable times (e.g. "08:00")
const getSlotCodes = (day: string, startTime: string, endTime: string): string[] => {
  const dayPrefixes: Record<string, string> = {
    Monday: "M", Tuesday: "Tu", Wednesday: "W", Thursday: "Th", Friday: "F", Saturday: "Sa",
    Mon: "M", Tue: "Tu", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa",
  };

  const prefix = dayPrefixes[day];
  if (!prefix) return [];

  const toHalfHourValue = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return (hours || 0) + ((minutes || 0) === 30 ? 0.5 : 0);
  };

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

const RoomSelector = ({
  isOpen,
  course,
  slot,
  onSelect,
  onClose,
  isLoading: actionLoading = false,
  error: actionError = null,
  isReplace = false,
}: RoomSelectorProps) => {
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [manualRoomNumber, setManualRoomNumber] = useState("");

  const isReady = isOpen && !!course && !!slot;

  useEffect(() => {
    if (!isOpen) {
      setSelectedRoom(null);
      setSelectedBuilding(null);
      setManualRoomNumber("");
      setAvailableRooms([]);
      setFetchError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!isOpen || !slot) return;

      try {
        setFetchLoading(true);
        setFetchError(null);

        // Get timing codes (e.g. M1, M2)
        // If slot.timings contains codes like "M1", use them. 
        // If it contains times like "08:00-09:30", we need to convert.
        let codes: string[] = [];
        const firstDay = slot.days[0];
        
        if (slot.timings.some(t => /^[A-Z][a-z]?\d+$/.test(t))) {
          codes = slot.timings;
        } else if (firstDay) {
          codes = getSlotCodes(firstDay, slot.startTime, slot.endTime);
        }

        if (codes.length === 0) {
          throw new Error("Could not determine slot codes for timing lookup");
        }

        const rooms = await schedulingService.getAvailableRooms(codes.join(","));
        setAvailableRooms(rooms);
        
        // Auto-select first building if available
        if (rooms.length > 0) {
          const buildings = Array.from(new Set(rooms.map(r => r.building || "Other"))).sort();
          if (buildings.length > 0) {
            setSelectedBuilding(buildings[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch available rooms:", err);
        setFetchError(err instanceof Error ? err.message : "Failed to load available rooms");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchAvailableRooms();
  }, [isOpen, slot]);

  const roomsByBuilding = useMemo(() => {
    const grouped: Record<string, Room[]> = {};
    availableRooms.forEach(room => {
      const b = room.building || "Other";
      if (!grouped[b]) grouped[b] = [];
      grouped[b].push(room);
    });
    return grouped;
  }, [availableRooms]);

  const buildings = useMemo(() => {
    return Object.keys(roomsByBuilding).sort();
  }, [roomsByBuilding]);

  const currentBuildingRooms = useMemo(() => {
    if (!selectedBuilding) return [];
    return roomsByBuilding[selectedBuilding] || [];
  }, [selectedBuilding, roomsByBuilding]);

  if (!isReady || !course || !slot) {
    return null;
  }

  const handleSelect = () => {
    const roomNumber = selectedRoom ?? manualRoomNumber.trim();
    if (roomNumber) {
      onSelect(roomNumber);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isReplace ? "Move Course" : "Select a Room"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isReplace ? (
                <>
                  Move <strong>{course.courseId}</strong> to {slot.days.join(", ")}{" "}
                  from {slot.startTime} to {slot.endTime}
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
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white/50 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {(actionError || fetchError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-medium text-red-800">{actionError || fetchError}</p>
            </div>
          )}

          {/* Course & Slot Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Course</div>
              <div className="text-sm font-bold text-gray-900 truncate">{course.courseId}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Students</div>
              <div className="text-sm font-bold text-gray-900">{course.studentId.length}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Day</div>
              <div className="text-sm font-bold text-gray-900">{slot.days.join(", ")}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Time</div>
              <div className="text-sm font-bold text-gray-900">{slot.startTime}-{slot.endTime}</div>
            </div>
          </div>

          {/* Room Selection Area */}
          <div className="space-y-6">
            {fetchLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium">Finding available rooms...</p>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="py-8 px-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                <p className="text-amber-800 font-medium mb-4">No automated room suggestions available for this slot.</p>
                <div className="max-w-xs mx-auto">
                  <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 text-left">Manual Entry</label>
                  <input
                    value={manualRoomNumber}
                    onChange={(e) => setManualRoomNumber(e.target.value)}
                    placeholder="Enter room number (e.g. 207)"
                    className="w-full rounded-lg border border-amber-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Building Tabs */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <Building2 size={14} /> Select Building
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {buildings.map((building) => (
                      <button
                        key={building}
                        onClick={() => setSelectedBuilding(building)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedBuilding === building
                            ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {building}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rooms Grid */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <LayoutGrid size={14} /> Available Rooms in {selectedBuilding}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {currentBuildingRooms.map((room) => {
                      const isSelected = selectedRoom === room.roomNumber;
                      const fits = room.capacity >= course.studentId.length;
                      
                      return (
                        <button
                          key={room._id}
                          onClick={() => {
                            setSelectedRoom(room.roomNumber);
                            setManualRoomNumber("");
                          }}
                          className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <div className={`font-bold text-lg ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                            {room.building && <span className="text-xs font-normal text-gray-400 block">{room.building}</span>}
                            {room.roomNumber}
                          </div>
                          <div className="text-xs text-gray-500 font-medium mt-1">
                            Cap: {room.capacity}
                          </div>
                          {!fits && (
                            <div className="text-[10px] text-red-600 font-bold mt-1">
                              Low Capacity
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-blue-600">
                              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                                <X size={10} className="text-white rotate-45" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Override */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Or enter room manually</label>
                  <input
                    value={manualRoomNumber}
                    onChange={(e) => {
                      setManualRoomNumber(e.target.value);
                      if (selectedRoom) setSelectedRoom(null);
                    }}
                    placeholder="e.g. 207"
                    className="w-full max-w-xs rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={(!selectedRoom && !manualRoomNumber.trim()) || actionLoading || fetchLoading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {actionLoading ? "Processing..." : isReplace ? "Confirm Move" : "Assign Room"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomSelector;
