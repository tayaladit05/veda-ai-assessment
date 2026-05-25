'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import { 
  Printer, 
  RefreshCw, 
  ArrowLeft, 
  HelpCircle, 
  Sparkles, 
  Loader2, 
  Calendar, 
  Edit3, 
  Check 
} from 'lucide-react';
import Link from 'next/link';

export default function AssessmentView() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  // Zustand state triggers
  const { 
    activeAssignment, 
    activePaper, 
    fetchAssignmentById, 
    fetchQuestionPaper, 
    regeneratePaper,
    isLoading 
  } = useAssessmentStore();

  // Local state for interactive student details inputs
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [section, setSection] = useState('');
  
  // Custom interactive feature: state to allow inline editing of questions
  const [editableSections, setEditableSections] = useState<any[]>([]);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAssignmentById(id as string);
      fetchQuestionPaper(id as string);
    }
  }, [id, fetchAssignmentById, fetchQuestionPaper]);

  // Synchronize local editable questions list when paper loads
  useEffect(() => {
    if (activePaper && activePaper.sections) {
      // Deep clone sections to allow safe editing
      setEditableSections(JSON.parse(JSON.stringify(activePaper.sections)));
    }
  }, [activePaper]);

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = async () => {
    if (!id) return;
    setIsRegenerating(true);
    try {
      await regeneratePaper(id as string);
      // Route back to the create page with ?generatingId= to let it hook up the WS tracker
      router.push(`/create?generatingId=${id}`);
    } catch (err) {
      console.error('Failed to trigger regeneration:', err);
      setIsRegenerating(false);
    }
  };

  const handleQuestionTextChange = (secIdx: number, qIdx: number, newText: string) => {
    const updated = [...editableSections];
    updated[secIdx].questions[qIdx].questionText = newText;
    setEditableSections(updated);
  };

  const getDifficultyBadgeClass = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy': return 'badge badge-easy';
      case 'moderate':
      case 'medium': return 'badge badge-moderate';
      case 'hard': return 'badge badge-hard';
      default: return 'badge';
    }
  };

  // Formatter for readable due dates
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculations for exam header stats
  const totalQuestions = editableSections.reduce((acc, sec) => acc + sec.questions.length, 0);
  const totalMarks = editableSections.reduce((acc, sec) => {
    return acc + sec.questions.reduce((qAcc: number, q: any) => qAcc + (parseInt(q.marks) || 0), 0);
  }, 0);

  if (isLoading && !activePaper) {
    return (
      <div className="container" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem'
      }}>
        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--accent-primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading question paper from VedaAI archive...</p>
      </div>
    );
  }

  if (!activePaper || !activeAssignment) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Assessment Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          We couldn't locate the question paper for this assignment. The generation might have failed or is still in progress.
        </p>
        <Link href="/" className="btn">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container fade-in" style={{ paddingBottom: '6rem' }}>
      
      {/* Return home link (Hidden on Print) */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: '0.9rem',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Inline editing toggle button (Hidden on Print) */}
        <button
          onClick={() => setIsEditingMode(!isEditingMode)}
          style={{
            background: isEditingMode ? 'var(--success-glow)' : 'rgba(255,255,255,0.04)',
            border: '1px solid',
            borderColor: isEditingMode ? 'var(--success)' : 'var(--glass-border)',
            color: isEditingMode ? 'var(--success)' : 'var(--text-secondary)',
            padding: '0.4rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s'
          }}
        >
          {isEditingMode ? <Check size={15} /> : <Edit3 size={15} />}
          <span>{isEditingMode ? 'Lock Content' : 'Edit Questions'}</span>
        </button>
      </div>

      {/* QUESTION PAPER LAYOUT */}
      <div className="glass-card" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        padding: '3rem 2.5rem',
        borderRadius: '16px',
        maxWidth: '900px',
        margin: '0 auto',
        // Support clean rendering for browser printing
        color: 'var(--text-primary)',
        transition: 'all 0.3s'
      }}>
        
        {/* Academic Printed Header Block */}
        <div style={{
          textAlign: 'center',
          borderBottom: '3px double var(--glass-border)',
          paddingBottom: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            color: 'var(--text-primary)'
          }}>
            {activeAssignment.title}
          </h2>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {activeAssignment.instructions || 'Standard Academic Assessment'}
          </p>

          {/* Exam metadata grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            borderTop: '1px solid var(--glass-border)',
            paddingTop: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            <div>
              <strong>Due Date:</strong> {formatDate(activeAssignment.dueDate)}
            </div>
            <div>
              <strong>Questions:</strong> {totalQuestions} total
            </div>
            <div>
              <strong>Max Marks:</strong> {totalMarks} pts
            </div>
            <div>
              <strong>Time Allowed:</strong> 2 Hours
            </div>
          </div>
        </div>

        {/* Student Details underline block */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2.5rem',
          background: 'var(--bg-primary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '1.2rem'
        }}>
          {/* Student Name */}
          <div style={{ flex: '2 1 250px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Student Name:
            </span>
            <input 
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="___________________________"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed var(--text-muted)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                flexGrow: 1,
                padding: '0.1rem 0.3rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Roll Number */}
          <div style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Roll Number:
            </span>
            <input 
              type="text"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="_______________"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed var(--text-muted)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                flexGrow: 1,
                padding: '0.1rem 0.3rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Section */}
          <div style={{ flex: '1 1 100px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Section:
            </span>
            <input 
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="_________"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px dashed var(--text-muted)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                flexGrow: 1,
                padding: '0.1rem 0.3rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* QUESTION SECTIONS LOOP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {editableSections.map((sec, secIdx) => (
            <div key={secIdx} className="section-container">
              
              {/* Section Header */}
              <div style={{
                borderBottom: '1.5px solid var(--text-secondary)',
                paddingBottom: '0.3rem',
                marginBottom: '1rem'
              }}>
                <h3 className="section-title-print" style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)'
                }}>
                  {sec.title}
                </h3>
              </div>
              <p className="section-instruction-print" style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                marginBottom: '1.5rem'
              }}>
                {sec.instruction}
              </p>

              {/* Questions Loop inside Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                {sec.questions.map((question: any, qIdx: number) => (
                  <div key={qIdx} className="question-item" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      width: '100%'
                    }}>
                      <div className="question-text-block" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexGrow: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                          Q{qIdx + 1}.
                        </span>
                        
                        {isEditingMode ? (
                          // Interactive question text edit
                          <textarea 
                            value={question.questionText}
                            onChange={(e) => handleQuestionTextChange(secIdx, qIdx, e.target.value)}
                            rows={2}
                            style={{
                              width: '100%',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--accent-primary)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontFamily: 'inherit',
                              fontSize: '1rem',
                              padding: '0.4rem',
                              outline: 'none',
                              resize: 'vertical'
                            }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-primary)', fontSize: '1rem', lineHeight: '1.5' }}>
                            {question.questionText}
                          </span>
                        )}
                      </div>

                      {/* Right Hand Side Badge & Marks indicators */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }} className="no-print">
                        <span className={getDifficultyBadgeClass(question.difficulty)}>
                          {question.difficulty}
                        </span>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap'
                        }}>
                          [{question.marks} Marks]
                        </span>
                      </div>

                      {/* Simple static marks printed for raw A4 prints */}
                      <span className="question-marks-print" style={{
                        display: 'none',
                        fontWeight: 'bold'
                      }}>
                        [{question.marks} M]
                      </span>
                    </div>

                    {/* Render Options if MCQ or True/False */}
                    {question.options && question.options.length > 0 && (
                      <div className="mcq-options-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.6rem',
                        paddingLeft: '1.5rem',
                        marginTop: '0.4rem'
                      }}>
                        {question.options.map((opt: string, optIdx: number) => {
                          const optionLabels = ['A', 'B', 'C', 'D'];
                          return (
                            <div key={optIdx} className="mcq-option-item" style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem'
                            }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--accent-primary)',
                                flexShrink: 0
                              }}>
                                {optionLabels[optIdx] || optIdx + 1}
                              </span>
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* FLOATING ACTION BAR FOR EDITING & DOWNLOADS (Hidden on Print) */}
      <div className="no-print" style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#25262c', /* premium dark charcoal grey */
        border: '1px solid rgba(255, 255, 255, 0.04)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px)',
        padding: '0.65rem 1rem',
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 50,
        maxWidth: '95%',
        width: 'max-content'
      }}>
        {/* Back to Dashboard link matching mockup */}
        <Link href="/" style={{
          padding: '0.6rem 1.4rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          borderRadius: '9999px',
          backgroundColor: '#1b1c21', /* dark inset background */
          border: 'none',
          color: '#878b9c', /* high contrast slate grey */
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.backgroundColor = '#1f2027';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#878b9c';
          e.currentTarget.style.backgroundColor = '#1b1c21';
        }}
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>

        {/* Regenerate Trigger - beautiful purple/violet pill button */}
        <button 
          onClick={handleRegenerate}
          disabled={isRegenerating}
          style={{
            padding: '0.6rem 1.4rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c4dff 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(124, 77, 255, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(124, 77, 255, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(124, 77, 255, 0.25)';
          }}
        >
          {isRegenerating ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>Regenerate AI</span>
            </>
          )}
        </button>

        {/* Vertical divider line */}
        <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.08)', margin: '0 0.2rem' }} />

        {/* Download PDF - beautiful emerald green pill button */}
        <button 
          onClick={handlePrint}
          style={{
            padding: '0.6rem 1.4rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            borderRadius: '9999px',
            background: '#10b981',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.background = '#059669';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = '#10b981';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.25)';
          }}
        >
          <Printer size={16} />
          <span>Download PDF</span>
        </button>
      </div>

    </div>
  );
}
