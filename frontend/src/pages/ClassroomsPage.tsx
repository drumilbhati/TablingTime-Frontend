import ClassroomTable from "../components/ClassroomTable";

const ClassroomsPage = () => {
  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      {/* Classrooms: full-width, no sidebar */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        <ClassroomTable selectedCourse={"CS101"} />
      </div>
    </div>
  );
};

export default ClassroomsPage;
