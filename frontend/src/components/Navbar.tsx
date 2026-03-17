import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userRole, userName, authLoading, login, logout } =
    useAuth();

  const isActive = (path: string) => location.pathname === path;

  const isAdmin = userRole === "admin";
  const navButtonClass = (path: string) =>
    `rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? "border-gray-900 bg-gray-50 text-black"
        : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-black"
    }`;

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
          className="app-brand cursor-pointer transition-colors hover:text-gray-500"
          onClick={() => navigate("/")}
        >
          TablingTime
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/timetable")}
            className={navButtonClass("/timetable")}
          >
            Timetable
          </button>

          {/* Admin-only nav links */}
          {isAdmin && (
            <>
              <button
                onClick={() => navigate("/occupied")}
                className={navButtonClass("/occupied")}
              >
                Occupied Rooms
              </button>
              <button
                onClick={() => navigate("/enrolment")}
                className={navButtonClass("/enrolment")}
              >
                Enrolment
              </button>
              <button
                onClick={() => navigate("/schedule")}
                className={navButtonClass("/schedule")}
              >
                Schedule
              </button>
              <button
                onClick={() => navigate("/manual-schedule")}
                className={navButtonClass("/manual-schedule")}
              >
                Manual Scheduler
              </button>
            </>
          )}

          {/* Auth section */}
          {authLoading ? (
            <div className="w-32 h-9 bg-gray-100 rounded-md animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Name + role */}
              <div className="flex flex-col items-end">
                {userName && (
                  <span className="text-sm font-medium text-gray-900 leading-tight">
                    {userName}
                  </span>
                )}
                {userRole && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize mt-0.5 ${getRoleBadgeStyle(userRole)}`}
                  >
                    {userRole}
                  </span>
                )}
              </div>

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
