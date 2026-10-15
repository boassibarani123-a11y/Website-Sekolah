export const isTeacher = (u) => !!u && (u.role === "guru" || !!u.teaching_duty);
export const isTeacherOrAdmin = (u) => !!u && (u.role === "super_admin" || isTeacher(u));
