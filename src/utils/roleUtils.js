// src/utils/roleUtils.js
export const getDashboardPath = (role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    case "student":
    default:
      return "/student";
  }
};
