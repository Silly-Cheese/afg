import React from 'react';
import { createRoot } from 'react-dom/client';
import AccountManagementPage from './AccountManagementPage.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountManagementPage />
  </React.StrictMode>,
);
