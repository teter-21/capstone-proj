import "./App.css";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";

import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

/* LAYOUTS */

import MainLayout from "./layout/MainLayout.jsx";
import PatientLayout from "./layout/PatientLayout.jsx";
import AuthLayout from "./layout/AuthLayout.jsx";

/* PUBLIC PAGES */

const Home = lazy(() => import("./pages/public/Home.jsx"));
const HomeLogin = lazy(() => import("./pages/public/HomeLogin.jsx"));
const BookAppointment = lazy(() => import("./pages/public/BookAppointment"));
const ForgotPassword = lazy(() => import("./pages/public/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/public/ResetPassword.jsx"));

/* ADMIN PAGES */

const Dashboard = lazy(() => import("./pages/admin/Dashbboard.jsx"));
const PatientMngmt = lazy(() => import("./pages/admin/PatientMngmt.jsx"));
const AddPatient = lazy(() => import("./pages/admin/AddPatient.jsx"));
const Settings = lazy(() => import("./pages/admin/Settings.jsx"));
const Report = lazy(() => import("./pages/admin/Report.jsx"));
const AppointmentMngmt = lazy(() => import("./pages/admin/AppointmentMngmt"));
const QueueMngmt = lazy(() => import("./pages/admin/QueueMngmt.jsx"));
const AdminPayment = lazy(() => import("./pages/admin/Payment.jsx"));
const Reviews = lazy(() => import("./pages/admin/Reviews.jsx"));

/* PATIENT PAGES */

const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard.jsx"));
const BookPatientAppointment = lazy(() => import("./pages/patient/BookPatientAppointment.jsx"));
const TreatmentHistory = lazy(() => import("./pages/patient/TreatmentHistory.jsx"));
const Profile = lazy(() => import("./pages/patient/Profile.jsx"));
const PatientReview = lazy(() => import("./pages/patient/PatientReview.jsx"));

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
        path: "Payment",
        element: <AdminPayment />,
      },

      {
        path: "Reviews",
        element: <Reviews />,
      },

      {
        path: "Report",
        element: <Report />,
      },

      {
        path: "Settings",
        element: <Settings />,
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
    <Suspense fallback={<div role="status" style={{ padding: "2rem" }}>Loading page…</div>}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
