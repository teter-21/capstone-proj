import React from "react";
import { Outlet } from "react-router-dom";
import "../css/PatientLayout.css";
import PatientSidebar from "../components/PatientSidebar.jsx";
import "../css/PatientSidebar.css";
import PatientNotifications from "../pages/patient/PatientNotification.jsx";

function PatientLayout() {

    return (
        <div className="patient-layout">

            <PatientSidebar />

            <main className="patient-main-content">

                <div className="patient-topbar">

                    <PatientNotifications />

                </div>

                <Outlet />

            </main>

        </div>
    );

}

export default PatientLayout; 
