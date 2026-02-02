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
  onConfirm: (confirm: boolean) => void;
  onClose: () => void;
}

const ClassroomCard = ({ classroom, section, sectionCapacity, onConfirm, onClose }: ClassroomCardProps) => {
  if (!classroom || !section) return null;

  return (
    <div className="w-full md:w-72 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Classroom Details</h3>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <div>
          <div className="text-xs text-gray-500">Building & Room</div>
          <div className="font-medium">{classroom.building} — {classroom.room}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Max Capacity</div>
          <div className="font-medium">{classroom.capacity}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Selected Section</div>
          <div className="font-medium">{section}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Section Capacity</div>
          <div className="font-medium">{sectionCapacity ?? "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onConfirm(true)}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-500"
        >
          Yes
        </button>
        <button
          onClick={() => onConfirm(false)}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
        >
          No
        </button>
      </div>
    </div>
  );
};

export default ClassroomCard;
