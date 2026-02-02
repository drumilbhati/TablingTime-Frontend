import { useState, useEffect } from "react";
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

  const sections = ["Sec_0", "Sec_1", "Sec_2", "Sec_3", "Sec_4"];

  const classrooms: Classroom[] = [
    { id: "002", building: "SAS", room: "100", capacity: 40 },
    { id: "003", building: "SAS", room: "101", capacity: 30 },
    { id: "004", building: "SAS", room: "102", capacity: 50 },
  ];

  // availability[classroomId][section] = boolean (true = available)
  const [availability, setAvailability] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    // try to load from localStorage
    try {
      const saved = localStorage.getItem("classroomBookings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore parse
    }

    const base: Record<string, Record<string, boolean>> = {};
    classrooms.forEach((c, i) => {
      base[c.id] = {};
      sections.forEach((s, si) => {
        base[c.id][s] = !(i === 0 && si === 0) && !(i === 1 && si === 2); // a couple of occupied as initial mock
      });
    });
    return base;
  });

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem("classroomBookings", JSON.stringify(availability));
    } catch (e) {
      // ignore
    }
  }, [availability]);

  const handleCellClick = (classroom: Classroom, section: string) => {
    // require a selected course to schedule
    if (!selectedCourse) return;

    if (!availability[classroom.id][section]) return; // do nothing if occupied

    setSelectedClassroom(classroom);
    setSelectedSection(section);

    // for demo, section capacity is same as room or a derived small number
    setSelectedSectionCapacity(Math.min(classroom.capacity, 40));
  };

  const handleConfirm = (confirm: boolean) => {
    if (!selectedClassroom || !selectedSection) {
      setSelectedClassroom(null);
      setSelectedSection(null);
      setSelectedSectionCapacity(null);
      return;
    }

    if (confirm) {
      setAvailability((prev) => ({
        ...prev,
        [selectedClassroom.id]: {
          ...prev[selectedClassroom.id],
          [selectedSection]: false,
        },
      }));
    }

    // close selection in either case
    setSelectedClassroom(null);
    setSelectedSection(null);
    setSelectedSectionCapacity(null);
  };

  return (
    <div className="grid gap-6 grid-cols-1 md:[grid-template-columns:16rem_1fr_20rem] md:[grid-template-rows:auto_auto]">
      <div className="w-64 flex-shrink-0 p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:col-start-1 md:row-start-1">
        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase font-medium">
            Selected Course
          </div>
          <div className="font-semibold text-sm mt-2">
            {selectedCourse ?? "None"}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase font-medium">
            Selected Section
          </div>
          <div className="font-semibold text-sm mt-2">
            {selectedSection ?? "None"}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase font-medium">
            Section Capacity
          </div>
          <div className="font-semibold text-sm mt-2">
            {selectedSectionCapacity ?? "—"}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 uppercase font-medium">
            Course School
          </div>
          <div className="text-sm mt-2 text-gray-600">Engineering</div>
        </div>
      </div>

      <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-auto overflow-x-auto md:col-start-1 md:col-end-4 md:row-start-2">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Available Class Rooms
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedCourse
              ? `Showing rooms for ${selectedCourse}`
              : "Select a course to enable scheduling"}
          </p>
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r px-3 py-3 text-left text-xs text-gray-600 min-w-[84px]">
                  Room
                </th>
                {sections.map((s) => (
                  <th
                    key={s}
                    className="border-b border-r px-3 py-3 text-xs text-gray-600 text-center min-w-[140px]"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {classrooms.map((c, idx) => (
                <tr
                  key={c.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="border-b border-r px-3 py-3 font-medium text-sm text-gray-700 sticky left-0 bg-inherit">
                    {c.id}
                  </td>
                  {sections.map((s) => {
                    const isAvailable = !!availability[c.id][s];
                    const disabled = !selectedCourse;

                    return (
                      <td
                        key={`${c.id}-${s}`}
                        onClick={() =>
                          !disabled && isAvailable && handleCellClick(c, s)
                        }
                        className={`border-b border-r px-3 py-3 text-center cursor-pointer transition-all min-w-[140px] ${disabled ? "bg-gray-50 text-gray-400" : isAvailable ? "hover:bg-gray-100" : "bg-red-50 text-red-700"}`}
                        role="button"
                        aria-pressed={!isAvailable}
                        tabIndex={disabled ? -1 : 0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !disabled && isAvailable)
                            handleCellClick(c, s);
                        }}
                      >
                        {isAvailable ? (
                          <div className="inline-flex items-center gap-2 justify-center">
                            <span className="h-3 w-3 rounded-full bg-green-400" />
                            <span className="text-sm">Available</span>
                          </div>
                        ) : (
                          <div className="text-sm">Occupied</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick list moved below the table */}
        <div className="mt-6">
          <div className="text-xs text-gray-500 uppercase font-medium mb-2">
            Quick list
          </div>
          <div className="flex gap-4 flex-wrap items-stretch justify-start">
            {classrooms.map((c) => {
              const availableCount = Object.values(availability[c.id]).filter(
                Boolean,
              ).length;
              const isAvailable = availableCount > 0;
              const disabled = !selectedCourse;

              return (
                <div
                  key={c.id}
                  className={`min-w-[220px] flex-1 max-w-[320px] flex items-center justify-between gap-4 p-3 bg-white border rounded-lg shadow-sm transition-shadow ${disabled ? "opacity-70" : "hover:shadow-md"}`}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {c.building} — {c.room}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Capacity: {c.capacity}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${isAvailable ? "bg-green-400" : "bg-red-400"}`}
                    />
                    <div
                      className={`text-sm ${isAvailable ? "text-gray-900" : "text-red-700"}`}
                    >
                      {isAvailable ? `${availableCount} available` : "Full"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-80 flex-shrink-0 md:col-start-3 md:row-start-1">
        <ClassroomCard
          classroom={selectedClassroom}
          section={selectedSection}
          sectionCapacity={selectedSectionCapacity}
          onConfirm={handleConfirm}
          onClose={() => handleConfirm(false)}
        />
      </div>
    </div>
  );
};

export default ClassroomTable;
