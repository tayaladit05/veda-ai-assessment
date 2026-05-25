'use client';

import { useEffect } from 'react';
import { useAssessmentStore } from '@/store/assessmentStore';
import '@/styles/globals.css';
import { 
  Sun, 
  Moon, 
  ArrowLeft, 
  LayoutGrid, 
  Bell, 
  ChevronDown, 
  Sparkles,
  Home,
  Users,
  FileText,
  Wrench,
  BookOpen,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme, assignments, fetchAssignments } = useAssessmentStore();
  const pathname = usePathname();
  const router = useRouter();

  // Initialize theme from store on mount
  useEffect(() => {
    // Set theme attribute on documentElement
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load assignments to populate counts dynamically
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <html lang="en" data-theme="light">
      <head>
        <title>VedaAI – AI Assessment Creator</title>
        <meta name="description" content="Generate high-fidelity, structured, and customized academic assessment question papers using state-of-the-art AI generation." />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        overflowX: 'hidden', 
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        transition: 'background-color 0.3s'
      }}>
        
        {/* Left Global Sidebar matching Mockup (Hidden on Print) */}
        <aside className="no-print" style={{
          width: '280px',
          minWidth: '280px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '2rem 1.4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 110,
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          {/* Top section: Logo, sparkles orange border create button, menu */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* VedaAI Logo with vibrant square icon */}
            <Link href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #ff7a00 100%)',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                fontWeight: 'bold',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontFamily: "'Outfit', sans-serif"
              }}>
                V
              </div>
              <span style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                fontFamily: "'Outfit', sans-serif",
                color: '#111827',
                letterSpacing: '-0.02em'
              }}>
                Veda<span style={{ color: '#ea580c' }}>AI</span>
              </span>
            </Link>

            {/* Create Assignment Button with Sparkling orange thick border matching mockup */}
            <Link href="/create" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#2b2d35',
              color: '#ffffff',
              borderRadius: '9999px',
              padding: '0.8rem 1.5rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 0 0 2px #ff5a36, 0 8px 20px rgba(255, 90, 54, 0.2)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              marginBottom: '2.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1b1c21';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2b2d35';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <Sparkles size={16} color="#ffffff" style={{ animation: 'pulse 1.5s infinite' }} />
              <span>Create Assignment</span>
            </Link>

            {/* Navigation links list */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: 'Home', icon: Home, active: pathname === '/' && assignments.length !== 0, count: null },
                { label: 'My Groups', icon: Users, active: false, count: null },
                { label: 'Assignments', icon: FileText, active: pathname === '/' || pathname.includes('assessment') || pathname === '/create', count: assignments.length },
                { label: "AI Teacher's Toolkit", icon: Wrench, active: false, count: null },
                { label: 'My Library', icon: BookOpen, active: false, count: null }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={idx} 
                    href="/"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      backgroundColor: item.active ? '#f3f4f6' : 'transparent',
                      color: item.active ? '#111827' : '#8e8e93',
                      fontWeight: item.active ? 700 : 500,
                      fontSize: '0.92rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!item.active) {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                        e.currentTarget.style.color = '#111827';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!item.active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#8e8e93';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <Icon size={18} style={{ color: item.active ? '#111827' : '#8e8e93' }} />
                      <span>{item.label}</span>
                    </div>

                    {/* Notification pill badge */}
                    {item.count !== null && item.count > 0 && (
                      <span style={{
                        backgroundColor: '#ff5a36',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 6px rgba(255, 90, 54, 0.2)'
                      }}>
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom links & Bokaro teacher school profile card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Settings Link */}
            <Link 
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.5rem 1rem',
                textDecoration: 'none',
                color: '#8e8e93',
                fontWeight: 600,
                fontSize: '0.92rem',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8e8e93'}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>

            {/* Bokaro School profile card matching mockup */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: '#f3f4f6',
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              border: '1px solid rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                👨‍🏫
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  Delhi Public School
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#8e8e93',
                  fontWeight: 500
                }}>
                  Bokaro Steel City
                </span>
              </div>
            </div>

          </div>

        </aside>

        {/* Right side main panel: Header + Child pages */}
        <div style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: (pathname === '/' && assignments.length === 0) ? '#ffffff' : 'var(--bg-primary)',
          transition: 'background-color 0.3s'
        }}>
          {/* Header matching mockup */}
          <header className="no-print" style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: (pathname === '/' && assignments.length === 0) ? '#ffffff' : 'rgba(245, 246, 248, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '1.5rem 2rem 0.5rem 2rem',
            width: '100%',
            transition: 'background 0.3s'
          }}>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              borderRadius: '20px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.3s, border-color 0.3s'
            }}>
              {/* Left Actions: Back Button & Context Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <button
                  onClick={() => {
                    if (pathname !== '/') {
                      router.push('/');
                    }
                  }}
                  disabled={pathname === '/'}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: pathname === '/' ? 'not-allowed' : 'pointer',
                    opacity: pathname === '/' ? 0.3 : 1,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s',
                    color: '#111827'
                  }}
                  onMouseEnter={(e) => {
                    if (pathname !== '/') e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== '/') e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                  title="Go back to Dashboard"
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LayoutGrid size={18} style={{ color: '#8e8e93' }} />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    color: '#8e8e93'
                  }}>
                    Assignment
                  </span>
                </div>
              </div>

              {/* Right Actions: Theme Toggle, Notifications, Profile Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <button 
                  onClick={toggleTheme}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Notification Bell with Badge */}
                <div style={{ position: 'relative' }}>
                  <button style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#111827',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  >
                    <Bell size={18} />
                  </button>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ff5a36',
                    borderRadius: '50%',
                    border: '1.5px solid var(--bg-secondary)'
                  }} />
                </div>

                {/* Profile CardDropdown */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#f3f4f6',
                  padding: '0.3rem 0.8rem 0.3rem 0.4rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    fontWeight: 700,
                    color: '#7c2d12'
                  }}>
                    👨‍🏫
                  </div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: '#111827'
                  }}>
                    John Doe
                  </span>
                  <ChevronDown size={14} style={{ color: '#52525b' }} />
                </div>
              </div>
            </div>
          </header>

          {/* Page contents children */}
          <main style={{ flexGrow: 1, position: 'relative' }}>
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}
