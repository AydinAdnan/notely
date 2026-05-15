import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-neu-black/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} setMobileOpen={setIsMobileOpen} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <Topbar onMenuClick={() => setIsMobileOpen(true)} />
        
        <div className="flex-1 overflow-hidden flex">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
