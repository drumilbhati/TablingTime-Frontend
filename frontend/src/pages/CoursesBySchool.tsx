import React, { useCallback, useEffect, useMemo, useState } from "react";
import schedulingService from "../services/schedulingService";
import ConfirmModal from "../components/ConfirmModal";
import type { Course } from "../context/CoursesContext";
import { useCourses } from "../context/CoursesContext";
import { useCourseModal } from "../context/CourseModalContext";
import { toast } from "sonner";

const SCHOOL_OPTIONS = ["SEAS", "SAS", "AMSOM"] as const;

type Section = Course;

const getSectionSortKey = (section: Section) => {
  const raw = section.section ?? section.displayCourseId ?? section.sectionId ?? "";
  const numeric = Number.parseInt(String(raw).replace(/\D+/g, ""), 10);
  return Number.isNaN(numeric) ? String(raw) : String(numeric).padStart(4, "0");
};

const getSectionLabel = (section: Section) => {
  if (section.section) return `Section ${section.section}`;
  if (section.displayCourseId) return `Section ${section.displayCourseId}`;
  if (section.sectionId) return `Section ${section.sectionId}`;
  return "Section -";
};

interface CourseGroup {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  courseType?: string;
  Faculty?: string;
  courseSchool?: string;
  sections: Section[];
  totalSections?: number;
}

const CoursesBySchool: React.FC = () => {
  const [school, setSchool] = useState<(typeof SCHOOL_OPTIONS)[number]>(SCHOOL_OPTIONS[0]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const { refetch: refetchAllCourses } = useCourses();
  const { open } = useCourseModal();
  const [sectionInputValues, setSectionInputValues] = useState<Record<string, string>>({});
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [courseDeleteConfirm, setCourseDeleteConfirm] = useState<{ id: string; name?: string } | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [sectionDeleteConfirm, setSectionDeleteConfirm] = useState<{ courseId: string; section: string; label?: string } | null>(null);
  const [deletingSection, setDeletingSection] = useState<{ courseId: string; section: string } | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await schedulingService.getCoursesBySchool(school);
      setSections((data as Section[]) || []);
    } catch (err) {
      setSections([]);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const grouped = useMemo(() => {
    const map = new Map<string, CourseGroup>();
    for (const s of sections) {
      const key = s.parentCourseId || s.courseId || s.courseCode || s._id;
      if (!map.has(key)) {
        map.set(key, {
          courseId: key,
          courseCode: s.courseCode,
          courseName: s.courseName,
          courseType: s.courseType,
          Faculty: s.Faculty,
          courseSchool: s.courseSchool,
          sections: [s],
        });
      } else {
        map.get(key)!.sections.push(s);
      }
    }

    return Array.from(map.values()).map((group) => ({
      ...group,
      // compute a backend-provided totalSections for the group when available
      totalSections:
        Number(
          group.sections.find((s) => Number(s.totalSections) > 0)?.totalSections ??
            group.sections.find((s) => Number(s.sectionCount) > 0)?.sectionCount ??
            group.sections.find((s) => Number(s.totalSectionCount) > 0)?.totalSectionCount ??
            group.sections.find((s) => Number(s.sectionsCount) > 0)?.sectionsCount ??
            0,
        ) || undefined,
      sections: [...group.sections].sort((a, b) => getSectionSortKey(a).localeCompare(getSectionSortKey(b))),
    }));
  }, [sections]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return grouped;
    return grouped.filter((g) => {
      const id = g.courseId?.toLowerCase() ?? "";
      const code = g.courseCode?.toLowerCase() ?? "";
      const name = g.courseName?.toLowerCase() ?? "";
      return id.includes(needle) || code.includes(needle) || name.includes(needle);
    });
  }, [grouped, query]);

  const resolveGroupTolerance = (group: CourseGroup) => Math.max(0, ...(group.sections.map((s) => Number(s.toleranceCount) || 0)));

  const handleDeleteAll = () => setShowDeleteAllConfirm(true);
  const performDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await schedulingService.deleteAllCourses();
      toast.success("All courses deleted.");
      setShowDeleteAllConfirm(false);
      await loadCourses();
      await refetchAllCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete all courses.");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteCourse = (courseId: string, courseName?: string) => setCourseDeleteConfirm({ id: courseId, name: courseName });
  const performDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      await schedulingService.deleteCourse(courseId);
      toast.success("Course deleted.");
      setCourseDeleteConfirm(null);
      await loadCourses();
      await refetchAllCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete course.");
    } finally {
      setDeletingCourseId(null);
    }
  };

  const performDeleteSection = async (courseId: string, section: string) => {
    setDeletingSection({ courseId, section });
    try {
      await schedulingService.deleteCourseSection(courseId, section);
      toast.success("Section deleted.");
      setSectionDeleteConfirm(null);
      await loadCourses();
      await refetchAllCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section.");
    } finally {
      setDeletingSection(null);
    }
  };

  return (
    <>
      <div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
        <div className="px-6 py-6 border-b border-gray-100 bg-white shadow-sm">
          <h1 className="page-title">Courses by School</h1>
          <p className="body-sm mt-0.5 text-gray-400">Browse the catalog filtered by school code.</p>
        </div>

        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="label-caps">School</label>
            <select value={school} onChange={(e) => setSchool(e.target.value as (typeof SCHOOL_OPTIONS)[number])} className="rounded border border-gray-200 px-3 py-2 text-sm">
              {SCHOOL_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by course ID, code, or name" className="flex-1 min-w-[220px] rounded border border-gray-200 px-3 py-2 text-sm" />

          <div className="ml-auto">
            {!showDeleteAllConfirm ? (
              <button onClick={handleDeleteAll} className="btn-danger px-3 py-1 text-xs text-white bg-rose-600 rounded-md">Delete All Courses</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-rose-600">Confirm delete all?</span>
                <button onClick={performDeleteAll} disabled={deletingAll} className="px-3 py-1 text-xs font-bold text-white bg-rose-600 rounded-md">{deletingAll ? "Deleting..." : "Yes, delete"}</button>
                <button onClick={() => setShowDeleteAllConfirm(false)} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md">Cancel</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
          {loading ? (
            <div className="h-48 bg-white border border-gray-100 rounded-xl animate-pulse" />
          ) : error ? (
            <div className="text-sm text-red-500 font-semibold">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-400">No courses found.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Faculty</th>
                    <th className="px-4 py-3 text-left">School</th>
                    <th className="px-4 py-3 text-left">Tolerance</th>
                    <th className="px-4 py-3 text-left">Sections</th>
                    <th className="px-4 py-3 text-left">Total Sections</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <React.Fragment key={g.courseId}>
                      <tr className="border-t border-gray-100 hover:bg-gray-50" onClick={() => setExpandedCourse(expandedCourse === g.courseId ? null : g.courseId)}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{g.courseCode || g.courseId}</td>
                        <td className="px-4 py-3 text-gray-600">{g.courseName || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{g.courseType || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{g.Faculty || "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{g.courseSchool || school}</td>
                        <td className="px-4 py-3 text-gray-500">{resolveGroupTolerance(g) > 0 ? `Tolerance: ${resolveGroupTolerance(g)}` : "-"}</td>
                        <td className="px-4 py-3 text-gray-700">{g.sections.length}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                              type="number"
                              min={0}
                              value={
                                sectionInputValues[g.courseId] ?? String(
                                  // Prefer the grouped backend-provided totalSections if present, otherwise fall back to real section count.
                                  (typeof g.totalSections === "number" && g.totalSections > 0 ? g.totalSections : g.sections.length)
                                )
                              }
                              onChange={(e) => setSectionInputValues((prev) => ({ ...prev, [g.courseId]: e.target.value }))}
                              className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
                            />
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const val = Number(sectionInputValues[g.courseId] ?? String(g.sections.length));
                                if (!Number.isFinite(val) || val < 0) {
                                  toast.error("Enter a valid section count.");
                                  return;
                                }
                                if (val === g.sections.length) {
                                  setSectionInputValues((prev) => { const c = { ...prev }; delete c[g.courseId]; return c; });
                                  return;
                                }
                                setSavingSections((s) => ({ ...s, [g.courseId]: true }));
                                try {
                                  await schedulingService.updateCourseSections({ courseId: g.courseId, numberOfSections: val });
                                  toast.success("Total sections updated.");
                                  setSectionInputValues((prev) => { const c = { ...prev }; delete c[g.courseId]; return c; });
                                  await loadCourses();
                                  await refetchAllCourses();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to update sections.");
                                } finally {
                                  setSavingSections((s) => ({ ...s, [g.courseId]: false }));
                                }
                              }}
                              disabled={Boolean(savingSections[g.courseId])}
                              className="rounded-md border border-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {savingSections[g.courseId] ? "Saving" : "Save"}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {courseDeleteConfirm?.id === g.courseId ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={(e) => { e.stopPropagation(); performDeleteCourse(g.courseId); }} disabled={deletingCourseId === g.courseId} className="px-3 py-1 text-xs font-bold text-white bg-rose-600 rounded-md">{deletingCourseId === g.courseId ? "Deleting..." : "Confirm"}</button>
                              <button onClick={(e) => { e.stopPropagation(); setCourseDeleteConfirm(null); }} className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(g.courseId, g.courseName ?? g.courseCode ?? g.courseId); }} className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-md border border-rose-100">Delete</button>
                          )}
                        </td>
                      </tr>

                      {expandedCourse === g.courseId && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="text-xs text-gray-400 uppercase tracking-widest">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Section</th>
                                    <th className="px-3 py-2 text-left">Professors</th>
                                    <th className="px-3 py-2 text-left">Students</th>
                                    <th className="px-3 py-2 text-left">Tolerance</th>
                                    <th className="px-3 py-2 text-left">Allocated</th>
                                    <th className="px-3 py-2 text-left">Timeslots</th>
                                    <th className="px-3 py-2 text-left">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.sections.map((s) => (
                                    <tr key={s._id} className="border-t border-gray-100">
                                      <td className="px-3 py-2 font-semibold">
                                        <button className="font-semibold" onClick={() => { const t = (s.timeslots || [])[0]; if (t) open(s as Course, t.day, t.startTime, t.endTime); else open(s as Course); }}>{getSectionLabel(s)}</button>
                                      </td>
                                      <td className="px-3 py-2">{Array.isArray(s.professorId) ? s.professorId.length : 0}</td>
                                      <td className="px-3 py-2">{Array.isArray(s.studentId) ? s.studentId.length : 0}</td>
                                      <td className="px-3 py-2">{Number(s.toleranceCount) > 0 ? `Tolerance: ${s.toleranceCount}` : "-"}</td>
                                      <td className="px-3 py-2">{s.isAllocated ? "Yes" : "No"}</td>
                                      <td className="px-3 py-2"><button className="text-left" onClick={() => { const t = (s.timeslots || [])[0]; if (t) open(s as Course, t.day, t.startTime, t.endTime); else open(s as Course); }}>{(s.timeslots || []).map(t => `${t.day} ${t.startTime}-${t.endTime}`).join(", ") || "-"}</button></td>
                                      <td className="px-3 py-2 text-right">
                                        <button onClick={(e) => { e.stopPropagation(); setSectionDeleteConfirm({ courseId: g.courseId, section: s.section ?? s.displayCourseId ?? s.sectionId ?? s._id, label: getSectionLabel(s) }); }} className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 rounded-md border border-rose-100">Delete</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal open={showDeleteAllConfirm} title="Delete all courses?" description="This will permanently remove all courses and sections. This action cannot be undone." confirmLabel="Delete all" cancelLabel="Cancel" danger loading={deletingAll} onConfirm={performDeleteAll} onCancel={() => setShowDeleteAllConfirm(false)} />

      <ConfirmModal open={Boolean(courseDeleteConfirm)} title={courseDeleteConfirm ? `Delete course ${courseDeleteConfirm.name ?? courseDeleteConfirm.id}?` : "Delete course?"} description="This will remove the course and all its sections. This action cannot be undone." confirmLabel="Delete" cancelLabel="Cancel" danger loading={Boolean(deletingCourseId)} onConfirm={() => courseDeleteConfirm && performDeleteCourse(courseDeleteConfirm.id)} onCancel={() => setCourseDeleteConfirm(null)} />

      <ConfirmModal open={Boolean(sectionDeleteConfirm)} title={sectionDeleteConfirm ? `Delete ${sectionDeleteConfirm.label ?? "section"}?` : "Delete section?"} description="This will remove this section from the course. This action cannot be undone." confirmLabel="Delete" cancelLabel="Cancel" danger loading={Boolean(deletingSection)} onConfirm={() => sectionDeleteConfirm && performDeleteSection(sectionDeleteConfirm.courseId, sectionDeleteConfirm.section)} onCancel={() => setSectionDeleteConfirm(null)} />
    </>
  );
};

export default CoursesBySchool;
