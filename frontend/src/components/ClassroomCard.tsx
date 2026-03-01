interface Classroom {
  id: string;
  building: string;
  room: string;
  capacity: number;
}

interface ClassroomCardProps {
  classroom: Classroom | null;
  section: string | null;
  sectionCapacity?: number | null;
  onConfirm: () => void;
  onClose: () => void;
}

const ClassroomCard = ({
  classroom,
  section,
  onConfirm,
  onClose,
}: ClassroomCardProps) => {
  if (!classroom || !section) return null;

  return (
    <div className="w-96 p-6 bg-white rounded-xl border border-gray-200 shadow-xl">
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Card for class room details
        </h3>
        <button
          onClick={onClose}
          className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 text-sm text-gray-700">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">
            Building_Room No
          </div>
          <div className="font-semibold mt-1 text-base">
            {classroom.building} — {classroom.room}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">Max. Capacity</div>
          <div className="font-semibold mt-1 text-base">
            {classroom.capacity}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">
            Current Time Slot
          </div>
          <div className="font-semibold mt-1 text-base">{section}</div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-base font-semibold text-gray-800 mb-4">
          Confirm???
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => onConfirm()}
            className="px-8 py-2.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-500 border border-green-600"
          >
            Yes
          </button>
          <button
            onClick={() => onConfirm()}
            className="px-8 py-2.5 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 border border-red-300"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassroomCard;
