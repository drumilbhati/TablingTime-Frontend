import { type Course } from "../context/CoursesContext";

const getCourseSectionValue = (
	course: Pick<
		Course,
		"section" | "sectionId" | "courseSectionId" | "displayCourseId"
	>,
) => {
	const candidates = [
		course.section,
		course.sectionId,
		course.courseSectionId,
		course.displayCourseId,
	];

	for (const candidate of candidates) {
		const value = String(candidate ?? "").trim();
		if (value) return value;
	}

	return "";
};

export const formatCourseSection = (
	course: Pick<
		Course,
		"section" | "sectionId" | "courseSectionId" | "displayCourseId"
	>,
) => {
	const sectionValue = getCourseSectionValue(course);
	return sectionValue ? `Section ${sectionValue}` : "Section unavailable";
};

export const formatCourseLabel = (
	course: Pick<
		Course,
		|
			"courseCode"
		| "courseId"
		| "courseName"
		| "section"
		| "sectionId"
		| "courseSectionId"
		| "displayCourseId"
	>,
) => {
	const courseCode = course.courseCode || course.courseId || course.courseName || "Course";
	const sectionValue = getCourseSectionValue(course);

	return sectionValue ? `${courseCode} • Section ${sectionValue}` : courseCode;
};