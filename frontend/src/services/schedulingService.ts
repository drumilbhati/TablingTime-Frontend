const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface SchedulingRequest {
  courseId: string;
  slotCode: string;
  roomNumber: string;
}

export interface SchedulingResponse {
  message: string;
  course: {
    _id: string;
    courseId: string;
    room: string[];
    timing: string[];
    timeslots: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  };
}

export interface Room {
  _id: string;
  roomNumber: string;
  capacity: number;
  schedule: Array<{
    timeSlot: string;
    courseId: string;
  }>;
}

export interface Slot {
  _id: string;
  code: string;
  credit: number;
  days: string[];
  startTime: string;
  endTime: string;
  timings: string[];
}

class SchedulingService {
  async manualScheduleCourse(
    request: SchedulingRequest,
  ): Promise<SchedulingResponse> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api/manual-schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Failed to schedule course: ${response.status}`,
      );
    }

    return response.json();
  }

  async getAllRooms(): Promise<Room[]> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api/rooms`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }

    return response.json();
  }

  async getAllSlots(): Promise<Slot[]> {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api/slots`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch slots: ${response.status}`);
    }

    return response.json();
  }
}

export default new SchedulingService();
