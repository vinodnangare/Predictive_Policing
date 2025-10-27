export const checkAuth = () => {
  const token = localStorage.getItem("token");
  const isAuth = localStorage.getItem("policeAuth") === "true";
  return token && isAuth;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("policeAuth");
};