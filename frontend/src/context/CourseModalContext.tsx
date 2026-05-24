import React, { createContext, useContext, useState } from "react";
import type { Course } from "./CoursesContext";
import { CourseDetailsModal } from "../components/CourseDetailsModal";

type ActiveModal = {
  course: Course;
  day?: string;
  startTime?: string;
  endTime?: string;
  onEditRoom?: () => void;
} | null;

type CourseModalContextType = {
  open: (
    course: Course,
    day?: string,
    startTime?: string,
    endTime?: string,
    onEditRoom?: () => void,
  ) => void;
  close: () => void;
};

const CourseModalContext = createContext<CourseModalContextType | undefined>(
  undefined,
);

export const CourseModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveModal>(null);

  const open = (
    course: Course,
    day?: string,
    startTime?: string,
    endTime?: string,
    onEditRoom?: () => void,
  ) => {
    setActive({ course, day, startTime, endTime, onEditRoom });
  };

  const close = () => setActive(null);

  return (
    <CourseModalContext.Provider value={{ open, close }}>
      {children}
      {active && (
        <CourseDetailsModal
          course={active.course}
          day={active.day || ""}
          startTime={active.startTime || ""}
          endTime={active.endTime || ""}
          isSelected={false}
          onClose={close}
          onEditRoom={active.onEditRoom}
        />
      )}
    </CourseModalContext.Provider>
  );
};

export const useCourseModal = () => {
  const ctx = useContext(CourseModalContext);
  if (!ctx) throw new Error("useCourseModal must be used within CourseModalProvider");
  return ctx;
};

export default CourseModalContext;
