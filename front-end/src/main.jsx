import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

/* LAYOUTS */

import MainLayout from "./layout/MainLayout.jsx";
import PatientLayout from "./layout/PatientLayout.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";

/* PUBLIC PAGES */

import Home from "./pages/public/Home.jsx";
import HomeLogin from "./pages/public/HomeLogin.jsx";
import BookAppointment from "./pages/public/BookAppointment";
import ForgotPassword from "./pages/public/ForgotPassword.jsx";
import ResetPassword from "./pages/public/ResetPassword.jsx";

/* ADMIN PAGES */

import Dashboard from "./pages/admin/Dashbboard.jsx";
import PatientMngmt from "./pages/admin/PatientMngmt.jsx";
import AddPatient from "./pages/admin/AddPatient.jsx";
import Report from "./pages/admin/Report.jsx";
import Settings from "./pages/admin/Settings.jsx";
import AdminAccounts from "./pages/admin/AdminAccounts.jsx";
import AppointmentMngmt from "./pages/admin/AppointmentMngmt";
import QueueMngmt from "./pages/admin/QueueMngmt.jsx";
import AdminPayment from "./pages/admin/Payment.jsx";
import Reviews from "./pages/admin/Reviews.jsx";

/* PATIENT PAGES */

import PatientDashboard from "./pages/patient/PatientDashboard.jsx";
import BookPatientAppointment from "./pages/patient/BookPatientAppointment.jsx";
import TreatmentHistory from "./pages/patient/TreatmentHistory.jsx";
import Profile from "./pages/patient/Profile.jsx";
import PatientReview from "./pages/patient/PatientReview.jsx";

/* ROUTE PROTECTION */

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";

const router = createBrowserRouter([
  /* PUBLIC ROUTES */

  {
    path: "/",

    element: <AuthLayout />,

    children: [
      {
        index: true,
        element: <Home />,
      },

      {
        path: "login",
        element: <HomeLogin />,
      },

      {
        path: "appointment",
        element: <BookAppointment />,
      },

      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },

      {
        path: "reset-password",
        element: <ResetPassword />,
      },
    ],
  },

  /* ADMIN ROUTES */

  {
    path: "/",

    element: (
      <ProtectedRoute>
        <RoleRoute role="admin">
          <MainLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),

    children: [
      {
        path: "Dashboard",
        element: <Dashboard />,
      },

      {
        path: "Appointments",
        element: <AppointmentMngmt />,
      },

      {
        path: "Queue",
        element: <QueueMngmt />,
      },

      {
        path: "PatientMngmt",
        element: <PatientMngmt />,
      },

      {
        path: "AddPatient",
        element: <AddPatient />,
      },

      {
        path: "Report",
        element: <Report />,
      },

      {
        path: "Payment",
        element: <AdminPayment />,
      },

      {
        path: "Reviews",
        element: <Reviews />,
      },

      {
        path: "Settings",
        element: <Settings />,
      },

      {
        path: "AdminAccounts",
        element: <AdminAccounts />,
      },
    ],
  },

  /* PATIENT ROUTES */

  {
    path: "/patient",

    element: (
      <ProtectedRoute>
        <RoleRoute role="patient">
          <PatientLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),

    children: [
      {
        path: "dashboard",
        element: <PatientDashboard />,
      },

      {
        path: "appointments",
        element: <Navigate to="/patient/dashboard" replace />,
      },
      {
        path: "book-appointment",
        element: <BookPatientAppointment />,
      },

      {
        path: "treatments",
        element: <TreatmentHistory />,
      },

      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "review",
        element: <PatientReview />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
