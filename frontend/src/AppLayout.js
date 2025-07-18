import React from 'react';
import Sidebar from './components/Sidebar';
import './AppLayout.css';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
