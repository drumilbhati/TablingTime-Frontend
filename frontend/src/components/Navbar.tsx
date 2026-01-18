import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 w-full p-4 shadow-md z-10">
      <div className="container max-w-7xl mx-auto flex justify-between items-center">
        <div
          className="flex text-[30px] font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          TablingTime
        </div>
        <Button
          className="mr-10px font-bold"
          onClick={() => navigate("/login")}
        >
          Login
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
