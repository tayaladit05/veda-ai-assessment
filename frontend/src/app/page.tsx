'use client';

import { useEffect, useState, useRef } from 'react';
import { useAssessmentStore } from '@/store/assessmentStore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Plus, 
  FileQuestion,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  BookOpen
} from 'lucide-react';

export default function Dashboard() {
  const { assignments, fetchAssignments, isLoading, deleteAssignment } = useAssessmentStore();
  const router = useRouter();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'generating' | 'failed'>('all');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatter for readable mockup-matched dates: DD-MM-YYYY
  const formatCardDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Perform deletion with dropdown close
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this assignment?')) {
      await deleteAssignment(id);
      setOpenDropdownId(null);
    }
  };

  const handleCardClick = (assignment: any) => {
    // If generating, route to create page with generating tracker parameters
    if (assignment.status === 'COMPLETED') {
      router.push(`/assessment/${assignment._id}`);
    } else {
      router.push(`/create?generatingId=${assignment._id}`);
    }
  };

  // Filtered lists
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'completed') return matchesSearch && assignment.status === 'COMPLETED';
    if (filterType === 'generating') return matchesSearch && (assignment.status === 'GENERATING' || assignment.status === 'PENDING');
    if (filterType === 'failed') return matchesSearch && assignment.status === 'FAILED';
    return matchesSearch;
  });

  if (!isLoading && assignments.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 120px)',
        backgroundColor: '#ffffff',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }} className="fade-in mobile-empty-state">
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '1.5rem' }}>
          <circle cx="110" cy="110" r="70" fill="#f3f4f6" />
          <path d="M70 60 C 55 62, 45 80, 75 80 C 95 80, 70 45, 55 90" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M70 142 L72 147 L77 149 L72 151 L70 156 L68 151 L63 149 L68 147 Z" fill="#3b82f6" />
          <circle cx="154" cy="130" r="4.5" fill="#3b82f6" />
          <rect x="135" y="55" width="28" height="18" rx="5" fill="#ffffff" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.05))" />
          <circle cx="141" cy="64" r="3" fill="#a78bfa" />
          <rect x="148" y="62" width="10" height="4" rx="2" fill="#e5e7eb" />
          <rect x="92" y="60" width="46" height="62" rx="8" fill="#ffffff" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.06))" />
          <rect x="100" y="70" width="18" height="4" rx="2" fill="#111827" />
          <rect x="100" y="80" width="30" height="3" rx="1.5" fill="#e5e7eb" />
          <rect x="100" y="88" width="22" height="3" rx="1.5" fill="#e5e7eb" />
          <rect x="100" y="96" width="30" height="3" rx="1.5" fill="#e5e7eb" />
          <circle cx="110" cy="110" r="26" fill="#ffffff" fillOpacity="0.8" stroke="#d1d5db" strokeWidth="3" />
          <circle cx="110" cy="110" r="12" fill="#fee2e2" />
          <path d="M106 106 L114 114 M114 106 L106 114" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M128 128 L144 144" stroke="#d1d5db" strokeWidth="6.5" strokeLinecap="round" />
        </svg>

        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '0.75rem',
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: '-0.02em'
        }}>
          No assignments yet
        </h2>

        <p style={{
          color: '#6b7280',
          maxWidth: '520px',
          fontSize: '0.96rem',
          lineHeight: '1.6',
          marginBottom: '2rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
        </p>

        <Link href="/create" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: '#111827',
          color: '#ffffff',
          padding: '0.8rem 1.8rem',
          borderRadius: '9999px',
          fontSize: '0.95rem',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(17, 24, 39, 0.15)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1f2937';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(17, 24, 39, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#111827';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 24, 39, 0.15)';
        }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 500, lineHeight: 0, marginTop: '-2px' }}>+</span>
          <span>Create Your First Assignment</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="container fade-in" style={{ paddingBottom: '7rem', maxWidth: '1000px' }}>
      
      {/* Header Block matching Mockup */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        marginBottom: '2.5rem',
        marginTop: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="green-dot-bullet" />
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)',
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '-0.02em'
          }}>
            Assignments
          </h1>
        </div>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.95rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          Manage and create assignments for your classes.
        </p>
      </div>

      {/* Action Controls: Filters & Search bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Left Side: Filter Pill */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '9999px',
              padding: '0.55rem 1.2rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'}
          >
            <Filter size={16} />
            <span>Filter By: {filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
          </button>

          {/* Filter dropdown selection */}
          {showFilterDropdown && (
            <div style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              zIndex: 80,
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              borderRadius: '12px',
              width: '180px',
              padding: '0.3rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}>
              {(['all', 'completed', 'generating', 'failed'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setShowFilterDropdown(false);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem 0.8rem',
                    background: filterType === type ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: filterType === type ? 600 : 500,
                    color: filterType === type ? '#111827' : '#52525b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => {
                    if (filterType !== type) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Pill Search */}
        <div className="search-pill-container" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#8e8e93' 
            }} 
          />
          <input 
            type="text"
            className="search-pill-input"
            style={{ width: '100%' }}
            placeholder="Search Assignment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && assignments.length === 0 ? (
        // Premium Skeletal Loading grid
        <div className="assignments-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="dashboard-card" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ height: '24px', width: '50%', background: '#e4e4e7', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '20px', width: '20px', background: '#e4e4e7', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ height: '16px', width: '35%', background: '#f4f4f5', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '16px', width: '35%', background: '#f4f4f5', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        // Premium Empty state card
        <div className="dashboard-card fade-in" style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          maxWidth: '650px',
          margin: '2rem auto'
        }}>
          <div style={{
            background: 'rgba(17, 24, 39, 0.03)',
            border: '1px solid rgba(17, 24, 39, 0.06)',
            width: '76px',
            height: '76px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            <FileQuestion size={36} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
              No Assessments Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Create your first homework sheet or academic exam. Customize question weights, load class PDF slide materials, and synthesize structured exams.
            </p>
          </div>
          <Link href="/create" className="stepper-nav-btn" style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}>
            Create Your First Assignment
          </Link>
        </div>
      ) : (
        // Grid cards list matching Mockup (2-column layout)
        <div className="assignments-grid">
          {filteredAssignments.map((assignment) => {
            const isCompleted = assignment.status === 'COMPLETED';
            const isGenerating = assignment.status === 'GENERATING' || assignment.status === 'PENDING';
            const isFailed = assignment.status === 'FAILED';

            return (
              <div 
                key={assignment._id} 
                className="dashboard-card fade-in" 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'visible'
                }}
                onClick={() => handleCardClick(assignment)}
              >
                {/* Visual Status Indicator Glow line on left */}
                {isGenerating && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                    background: 'var(--success)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px',
                    animation: 'pulse 1.5s infinite'
                  }} />
                )}
                {isFailed && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
                    background: 'var(--error)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px'
                  }} />
                )}

                {/* Card Title & Options Menu Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <h3 style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    lineHeight: '1.3',
                    color: 'var(--text-primary)',
                    fontFamily: "'Outfit', sans-serif",
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={assignment.title}>
                    {assignment.title}
                  </h3>

                  {/* 3-dots Menu Button */}
                  <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === assignment._id ? null : assignment._id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* Action dropdown card menu */}
                    {openDropdownId === assignment._id && (
                      <div 
                        ref={dropdownRef}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          zIndex: 90,
                          backgroundColor: '#ffffff',
                          border: '1px solid rgba(0,0,0,0.08)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                          borderRadius: '12px',
                          width: '160px',
                          padding: '0.35rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem'
                        }}
                      >
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            handleCardClick(assignment);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'left',
                            padding: '0.5rem 0.6rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#111827',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Eye size={14} style={{ color: '#52525b' }} />
                          <span>{isCompleted ? 'View Assignment' : 'Track Status'}</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(assignment._id, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'left',
                            padding: '0.5rem 0.6rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--error)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={14} style={{ color: 'var(--error)' }} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates & Status indicators row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  {/* Left: Assigned On */}
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned on : </span>
                    <strong style={{ color: '#52525b', fontWeight: 600 }}>{formatCardDate(assignment.createdAt)}</strong>
                  </div>

                  {/* Right: Due Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Due : </span>
                    <strong style={{ color: '#52525b', fontWeight: 600 }}>{formatCardDate(assignment.dueDate)}</strong>
                    
                    {/* Tiny visual state indicators (useful for track jobs) */}
                    {isGenerating && (
                      <span style={{ 
                        display: 'inline-flex', alignSelf: 'center',
                        marginLeft: '0.4rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)',
                        fontSize: '0.7rem', fontWeight: 700
                      }}>
                        SYNTHESIS...
                      </span>
                    )}
                    {isFailed && (
                      <span style={{ 
                        display: 'inline-flex', alignSelf: 'center',
                        marginLeft: '0.4rem', padding: '0.1rem 0.4rem', borderRadius: '4px',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--error)',
                        fontSize: '0.7rem', fontWeight: 700
                      }}>
                        ERROR
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Pill Action Button floating at the bottom center */}
      <Link href="/create" className="floating-create-btn">
        <Plus size={18} strokeWidth={2.5} />
        <span>Create Assignment</span>
      </Link>

    </div>
  );
}
