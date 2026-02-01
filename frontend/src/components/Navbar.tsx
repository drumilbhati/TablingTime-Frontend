import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="top-0 left-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
        <div
          className="text-4xl font-bold text-black cursor-pointer hover:text-gray-500 transition-colors"
          onClick={() => navigate("/")}
        >
          TablingTime
        </div>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-gray-900 rounded-md hover:bg-gray-800 transition-colors"
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
