import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="top-0 left-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
        <div
          className="text-4xl font-bold text-black cursor-pointer hover:text-gray-500 transition-colors"
          onClick={() => navigate("/")}
        >
          TablingTime
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/timetable")}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive("/timetable")
                ? "text-black border-b-2 border-black"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Timetable
          </button>
          <button
            onClick={() => navigate("/classrooms")}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive("/classrooms")
                ? "text-black border-b-2 border-black"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Classrooms
          </button>
          <button
            onClick={() => navigate("/occupied")}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive("/occupied")
                ? "text-black border-b-2 border-black"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Occupied Rooms
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-900 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => navigate("/login")}
            title="Placeholder for username/email"
          >
            Login
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
