import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';
import { CopilotDrawer } from '../common/CopilotDrawer';
import { ParticleCanvas } from '../common/ParticleCanvas';
import { CustomCursor } from '../common/CustomCursor';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC = () => {
  const { isFocusMode } = useApp();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-slate-100 relative">
      {/* Interactive WebGL/Canvas Particle Mesh Background */}
      <ParticleCanvas />

      {/* Custom Glowing Cursor Follower */}
      <CustomCursor />

      {/* Hide Sidebar in True Fullscreen Focus Mode */}
      {!isFocusMode && <Sidebar />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {!isFocusMode && <Header />}

        <main className={`flex-1 overflow-y-auto bg-hero-gradient ${isFocusMode ? 'p-0 h-full w-full z-50' : 'p-4 md:p-6 lg:p-8 space-y-8'}`}>
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Drawers */}
      {!isFocusMode && <CommandPalette />}
      {!isFocusMode && <CopilotDrawer />}
    </div>
  );
};
