import React, { useState } from 'react';
import OptaVisionDashboard from './components/dashboard/OptaVisionDashboard';
import LoginScreen from './components/layout/LoginScreen';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#131313]">
      <OptaVisionDashboard user={user} />
    </div>
  );
}

export default App;
