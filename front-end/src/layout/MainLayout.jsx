import React from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
    return (
        <div className="layout">

            {/* TOP NAVIGATION */}
            <Navbar />

            {/* SIDEBAR + PAGE CONTENT */}
            <div className="main-container">

                <Sidebar />

                <main className="content">
                    <Outlet />
                </main>

            </div>

        </div>
    );
}

export default MainLayout;
