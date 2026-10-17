import React from "react";
import PermissionProvider from "../components/PermissionProvider";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
    return (
        <PermissionProvider><div className="layout">

            {/* TOP NAVIGATION */}
            <Navbar />

            {/* SIDEBAR + PAGE CONTENT */}
            <div className="main-container">

                <Sidebar />

                <main className="content">
                    <Outlet />
                </main>

            </div>

        </div></PermissionProvider>
    );
}

export default MainLayout;
