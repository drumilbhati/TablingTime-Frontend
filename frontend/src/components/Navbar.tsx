import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, login, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200";
      case "faculty":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "student":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <nav className="top-0 left-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div
          className="text-4xl font-bold text-black cursor-pointer hover:text-gray-500 transition-colors"
          onClick={() => navigate("/")}
        >
          TablingTime
        </div>

        {/* Nav links */}
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

          {/* Auth section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Role badge */}
              {userRole && (
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${getRoleBadgeStyle(userRole)}`}
                >
                  {userRole}
                </span>
              )}

              {/* Logout button */}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
