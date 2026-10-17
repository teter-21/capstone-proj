import { createContext, useContext } from 'react';
export const PermissionContext = createContext([]);
export const usePermissions = () => {
  const permissions = useContext(PermissionContext);
  return permission => permissions.includes(permission);
};
export const pagePermissions = {
  '/Dashboard': 'dashboard.read', '/Appointments': 'appointments.read', '/Queue': 'queue.read',
  '/PatientMngmt': 'patients.read', '/AddPatient': 'patients.write', '/Payment': 'billing.manage',
  '/Report': 'reports.read', '/Reviews': 'reviews.manage',
};
