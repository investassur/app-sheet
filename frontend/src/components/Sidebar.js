import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { FiGrid, FiUsers, FiFileText, FiBarChart2, FiSettings, FiZap, FiFilter, FiMail, FiSend } from 'react-icons/fi';

const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FiGrid /> },
    { name: 'Prospects', path: '/prospects', icon: <FiUsers /> },
    { name: 'Contrats', path: '/contrats', icon: <FiFileText /> },
    { name: 'Rapports', path: '/rapports', icon: <FiBarChart2 /> },
    { name: 'Segmentation', path: '/segments-ia', icon: <FiFilter /> },
    { name: 'Automatisation', path: '/workflows', icon: <FiZap /> },
    { name: 'Templates Email', path: '/scenarios-emailing', icon: <FiMail /> },
    { name: 'Campagnes', path: '/campagnes', icon: <FiSend /> },
];

const adminMenu = [
    { name: 'Admin', path: '/administration', icon: <FiSettings /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <h1>AssurCRM</h1>
        <small>Courtage Senior</small>
      </div>
      <nav className="flex-grow">
        <ul>
          {menuItems.map(item => (
            <li key={item.name}>
              <NavLink to={item.path} className={({ isActive }) => isActive ? 'active' : ''} end={item.path === '/'}>
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
          <ul>
              {adminMenu.map(item => (
                <li key={item.name}>
                  <NavLink to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
          </ul>
      </div>
    </aside>
  );
}
