import { useState } from 'react';
import ClassroomCard from './ClassroomCard';

interface Room {
  id: string;
  building: string;
  roomNo: string;
  capacity: number;
  available: boolean;
}

const ClassroomTable = () => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Mock data for classroom availability
  const sections = ['002', '003', '004', '005', '006'];
  const seasons = ['Seas_0', 'Seas_1', 'Seas_2', 'Seas_3', 'Sas_0', 'Sas_1', 'Sas_2'];
  
  // Mock room data for each section and season
  const roomData: { [key: string]: string } = {
    '002-Seas_0': '100',
    '002-Seas_1': '100',
    '003-Seas_0': '101',
    '003-Seas_1': '101',
    '004-Seas_0': '102',
    '004-Seas_1': '102',
  };

  const handleRoomClick = (section: string, season: string) => {
    const roomKey = `${section}-${season}`;
    const roomNo = roomData[roomKey];
    
    if (roomNo) {
      const room: Room = {
        id: roomKey,
        building: 'A',
        roomNo: roomNo,
        capacity: 50,
        available: true
      };
      setSelectedRoom(room);
      setShowConfirmModal(true);
    }
  };

  const handleConfirm = () => {
    console.log('Room confirmed:', selectedRoom);
    setShowConfirmModal(false);
    setSelectedRoom(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setSelectedRoom(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Classroom Availability</h2>
        <p className="text-sm text-gray-600">Select an available classroom for scheduling</p>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-sky-400 to-blue-500 border-b-2 border-sky-600">
              <th className="px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wide">
                Section
              </th>
              {seasons.map((season) => (
                <th key={season} className="px-6 py-4 text-center text-sm font-bold text-white uppercase tracking-wide">
                  {season}
                </th>
              ))}
              <th className="px-6 py-4 text-center text-sm font-bold text-white uppercase tracking-wide">
                ...
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, idx) => (
              <tr key={section} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'} style={{transition: 'background-color 0.2s'}}>
                <td className="px-6 py-5 text-sm font-bold text-gray-800 border-r border-gray-200">
                  {section}
                </td>
                {seasons.map((season) => {
                  const roomNo = roomData[`${section}-${season}`];
                  return (
                    <td 
                      key={season} 
                      className="px-6 py-5 text-center border-r border-gray-200"
                    >
                      {roomNo ? (
                        <button
                          onClick={() => handleRoomClick(section, season)}
                          className="px-4 py-2 bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 rounded-lg hover:from-sky-200 hover:to-blue-200 transition-all text-sm font-bold shadow-sm hover:shadow-md transform hover:scale-105"
                        >
                          {roomNo}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-6 py-5 text-center text-gray-400 text-sm">...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p className="mb-2 font-medium">Note:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click on a room number to view details and confirm</li>
          <li>Blue cells indicate available rooms</li>
          <li>Gray cells indicate no room assigned</li>
        </ul>
      </div>

      {showConfirmModal && selectedRoom && (
        <ClassroomCard
          room={selectedRoom}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          currentTimeSlot="Seas_0"
        />
      )}
    </div>
  );
};

export default ClassroomTable;
