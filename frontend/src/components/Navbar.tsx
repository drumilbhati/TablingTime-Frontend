import { Button } from "./ui/button";


const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full p-4 shadow-md z-10">
      <div className="container max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex text-[30px] font-bold">TablingTime</div>
        <Button className="mr-[10px] font-bold">Login</Button>
      </div>
    </nav>
  );
}

export default Navbar;
