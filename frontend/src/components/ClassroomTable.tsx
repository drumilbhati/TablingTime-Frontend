import { useState } from "react";
import ClassroomCard from "./ClassroomCard";

interface ClassroomTableProps {
  selectedCourse: string | null;
}

interface Classroom {
  id: string;
  building: string;
  room: string;
  capacity: number;
}

const ClassroomTable = ({ selectedCourse }: ClassroomTableProps) => {
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null,
  );
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSectionCapacity, setSelectedSectionCapacity] = useState<
    number | null
  >(null);

  const roomColumns = [
    "Seas_0", "Seas_1", "Seas_2", "Seas_3",
    "Sas_0", "Sas_1", "Sas_2",
  ];

  const classrooms: Classroom[] = [
    { id: "002", building: "Seas", room: "100", capacity: 40 },
    { id: "003", building: "Seas", room: "101", capacity: 30 },
    { id: "004", building: "Sas", room: "102", capacity: 50 },
  ];

  const handleCellClick = (classroom: Classroom, roomCol: string) => {
    if (!selectedCourse) return;
    setSelectedClassroom(classroom);
    setSelectedSection(roomCol);
    setSelectedSectionCapacity(Math.min(classroom.capacity, 40));
  };

  const handleConfirm = (_confirm: boolean) => {
    if (!selectedClassroom || !selectedSection) {
      setSelectedClassroom(null);
      setSelectedSection(null);
      setSelectedSectionCapacity(null);
      return;
    }

    // close selection in either case
    setSelectedClassroom(null);
    setSelectedSection(null);
    setSelectedSectionCapacity(null);
  };

  return (
    <>
      <div className="flex gap-6 h-full">
        {/* Left panel: course details */}
        <div className="w-56 flex-shrink-0 space-y-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-medium">
              Selected Course Code
            </div>
            <div className="font-semibold text-sm mt-2">
              {selectedCourse ?? "None"}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-medium">
              Selected Section
            </div>
            <div className="font-semibold text-sm mt-2">
              {selectedSection ?? "None"}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-medium">
              Section Capacity
            </div>
            <div className="font-semibold text-sm mt-2">
              {selectedSectionCapacity ?? "—"}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-medium">
              Course School
            </div>
            <div className="text-sm mt-2 text-gray-600">Engineering</div>
          </div>
        </div>

        {/* Main table — fills remaining space */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Available Class Rooms
            </h2>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-200 px-4 py-4 text-left text-sm text-gray-600 font-semibold w-24">
                  </th>
                  {roomColumns.map((col) => (
                    <th
                      key={col}
                      className="border-b border-r border-gray-200 px-4 py-4 text-sm text-gray-600 text-center font-semibold"
                    >
                      {col}
                    </th>
                  ))}
                  <th className="border-b border-gray-200 px-4 py-4 text-sm text-gray-400 text-center w-16">
                    …
                  </th>
                </tr>
              </thead>

              <tbody>
                {classrooms.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="border-b border-r border-gray-200 px-4 py-4 font-medium text-sm text-gray-700">
                      {c.id}
                    </td>
                    {roomColumns.map((col) => (
                      <td
                        key={`${c.id}-${col}`}
                        onClick={() => handleCellClick(c, col)}
                        className="border-b border-r border-gray-200 px-4 py-4 text-center text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-all"
                      >
                      </td>
                    ))}
                    <td className="border-b border-gray-200 px-4 py-4 text-center text-sm text-gray-400">
                      …
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal overlay for classroom card */}
      {selectedClassroom && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => handleConfirm(false)}
          />
          <div className="relative z-10">
            <ClassroomCard
              classroom={selectedClassroom}
              section={selectedSection}
              sectionCapacity={selectedSectionCapacity}
              onConfirm={handleConfirm}
              onClose={() => handleConfirm(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ClassroomTable;
