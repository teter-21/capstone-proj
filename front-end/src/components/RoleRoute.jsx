import { Navigate } from "react-router-dom";

function RoleRoute({ role, children }) {
  const userRole = localStorage.getItem("role");

  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleRoute;
