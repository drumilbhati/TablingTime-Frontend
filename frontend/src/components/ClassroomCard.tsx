interface Room {
  id: string;
  building: string;
  roomNo: string;
  capacity: number;
  available: boolean;
}

interface ClassroomCardProps {
  room: Room;
  onConfirm: () => void;
  onCancel: () => void;
  currentTimeSlot: string;
}

const ClassroomCard = ({ room, onConfirm, onCancel, currentTimeSlot }: ClassroomCardProps) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Modal Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 w-96 max-w-[90vw] transform transition-all">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full text-2xl font-bold leading-none w-9 h-9 flex items-center justify-center transition-all"
        >
          ×
        </button>

        {/* Card Header */}
        <h3 className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent mb-8 text-center">
          Classroom Details
        </h3>

        {/* Card Content */}
        <div className="space-y-4">
          <div className="border-2 border-sky-200 rounded-xl p-5 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
            <p className="text-xs text-sky-600 uppercase tracking-wide font-semibold mb-2">Building & Room No</p>
            <p className="text-2xl font-bold text-gray-800">
              {room.building} - {room.roomNo}
            </p>
          </div>

          <div className="border-2 border-sky-200 rounded-xl p-5 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
            <p className="text-xs text-sky-600 uppercase tracking-wide font-semibold mb-2">Max. Capacity</p>
            <p className="text-2xl font-bold text-gray-800">{room.capacity}</p>
          </div>

          <div className="border-2 border-sky-200 rounded-xl p-5 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
            <p className="text-xs text-sky-600 uppercase tracking-wide font-semibold mb-2">Current Time Slot</p>
            <p className="text-2xl font-bold text-gray-800">{currentTimeSlot}</p>
          </div>
        </div>

        {/* Confirm Section */}
        <div className="mt-8">
          <p className="text-center text-base text-gray-700 font-semibold mb-4">Confirm Classroom Selection?</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onConfirm}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomCard;
