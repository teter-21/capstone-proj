import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import api from "../api";
import { PermissionContext, pagePermissions } from "../utils/permissions";
export default function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [failed, setFailed] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    let active = true;
    api
      .get("/account")
      .then(({ data }) => {
        if (active) setPermissions(data.permissions || []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (failed) return <p>Unable to verify access. Please sign in again.</p>;
  if (!permissions) return <p role="status">Checking access…</p>;
  if (
    pagePermissions[pathname] &&
    !permissions.includes(pagePermissions[pathname])
  )
    return <Navigate to="/Settings" replace />;
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}
