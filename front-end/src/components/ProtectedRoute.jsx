import { getAccessToken } from "../utils/session.js";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = getAccessToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const settings = localStorage.getItem('role') === 'admin' ? '/Settings' : '/patient/profile';
  if (localStorage.getItem('must_change_password') === '1' && location.pathname !== settings)
    return <Navigate to={settings} replace />;
  return children;
}

export default ProtectedRoute;
