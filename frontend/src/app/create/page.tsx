'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAssessmentStore } from '@/store/assessmentStore';
import { 
  Upload, 
  Calendar, 
  HelpCircle, 
  FileText, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  X,
  Plus,
  Mic,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';

interface QuestionRow {
  id: string;
  type: string;
  count: number;
  marks: number;
}

function CreateAssignmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Zustand store triggers
  const { 
    createAssignment, 
    connectWebSocket, 
    disconnectWebSocket, 
    generationProgress, 
    resetGenerationProgress 
  } = useAssessmentStore();

  const generatingIdParam = searchParams.get('generatingId');

  // Form states
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Custom interactive rows state matching Figma mockup default counts/types
  const [questionRows, setQuestionRows] = useState<QuestionRow[]>([
    { id: '1', type: 'Multiple Choice Questions', count: 4, marks: 1 },
    { id: '2', type: 'Short Questions', count: 3, marks: 2 },
    { id: '3', type: 'Diagram/Graph-Based Questions', count: 5, marks: 5 },
    { id: '4', type: 'Numerical Problems', count: 5, marks: 5 }
  ]);

  // UI states
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgressScreen, setShowProgressScreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // If a generatingId is passed in the query params (e.g. from Dashboard "Track Job"), enter tracking mode directly
  useEffect(() => {
    if (generatingIdParam) {
      setShowProgressScreen(true);
      connectWebSocket(generatingIdParam, () => {
        // Callback on completion: redirect to result page after small delay
        setTimeout(() => {
          router.push(`/assessment/${generatingIdParam}`);
          resetGenerationProgress();
        }, 1500);
      });
    }

    return () => {
      disconnectWebSocket();
    };
  }, [generatingIdParam, connectWebSocket, disconnectWebSocket, router, resetGenerationProgress]);

  // Dynamic Row Action Handlers
  const addQuestionRow = () => {
    const newId = Date.now().toString();
    setQuestionRows([
      ...questionRows,
      { id: newId, type: 'Multiple Choice Questions', count: 5, marks: 1 }
    ]);
  };

  const removeQuestionRow = (id: string) => {
    if (questionRows.length > 1) {
      setQuestionRows(questionRows.filter(row => row.id !== id));
    } else {
      setValidationError('You must have at least one question type row.');
    }
  };

  const updateRowField = (id: string, field: 'count' | 'marks', delta: number) => {
    setValidationError('');
    setQuestionRows(questionRows.map(row => {
      if (row.id === id) {
        const value = Math.max(1, row[field] + delta);
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleTypeSelection = (id: string, type: string) => {
    setQuestionRows(questionRows.map(row => {
      if (row.id === id) {
        return { ...row, type };
      }
      return row;
    }));
  };

  // Sum total calculations
  const totalQuestions = questionRows.reduce((sum, row) => sum + row.count, 0);
  const totalMarks = questionRows.reduce((sum, row) => sum + (row.count * row.marks), 0);

  // Handle file drop/drag
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    // In Figma it says JPEG, PNG up to 10MB! Let's allow images + PDF + TXT
    const isImage = selectedFile.type.startsWith('image/');
    const isPdfOrTxt = selectedFile.type === 'application/pdf' || selectedFile.type === 'text/plain';
    
    if (!isImage && !isPdfOrTxt) {
      setValidationError('Invalid file format. Please upload PDF, TXT, JPEG, or PNG.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setValidationError('File size exceeds the 10MB limit.');
      return;
    }
    setFile(selectedFile);
    setValidationError('');
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Form validation checks
    if (!title.trim()) {
      setValidationError('Please enter a descriptive assignment title.');
      return;
    }
    if (!dueDate) {
      setValidationError('Please select a due date.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dueDate);
    if (selectedDate < today) {
      setValidationError('Due date cannot be in the past.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build dynamic instruction prefix outlining exact counts and marks for the worker
      let structuredInstructions = `
Please generate exactly the following question distribution:
${questionRows.map(row => `- ${row.count} questions of type "${row.type}", each worth ${row.marks} marks.`).join('\n')}
`;
      if (instructions.trim()) {
        structuredInstructions += `\nAdditional details:\n${instructions}`;
      }

      // Compile unique list of question types
      const uniqueTypes = Array.from(new Set(questionRows.map(row => {
        // Map Figma types to backend mock types
        const t = row.type;
        if (t.includes('Multiple Choice')) return 'MCQ';
        if (t.includes('Short')) return 'Short Answer';
        if (t.includes('Diagram')) return 'Short Answer'; // Fallback
        if (t.includes('Numerical')) return 'Short Answer'; // Fallback
        return t;
      })));

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('dueDate', dueDate);
      formData.append('questionCount', totalQuestions.toString());
      formData.append('questionTypes', JSON.stringify(uniqueTypes));
      formData.append('instructions', structuredInstructions);
      
      if (file) {
        formData.append('file', file);
      }

      // 1. Submit form parameters to create PENDING task in DB
      const assignment = await createAssignment(formData);
      
      // 2. Transition page state to progress monitor
      setShowProgressScreen(true);

      // 3. Mount WebSocket connection to track live queue stages
      connectWebSocket(assignment._id, () => {
        // Automated redirect on success
        setTimeout(() => {
          router.push(`/assessment/${assignment._id}`);
          resetGenerationProgress();
        }, 1500);
      });
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Failed to submit assignment. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    disconnectWebSocket();
    resetGenerationProgress();
    setShowProgressScreen(false);
    setIsSubmitting(false);
    if (generatingIdParam) {
      router.push('/create');
    }
  };

  // Question type selector options
  const availableQuestionTypes = [
    'Multiple Choice Questions',
    'Short Questions',
    'Diagram/Graph-Based Questions',
    'Numerical Problems',
    'Long Answer Questions'
  ];

  return (
    <div className="container fade-in" style={{ maxWidth: '800px', paddingBottom: '5rem' }}>
      
      {/* Mobile-only header back button & title matching Mockup */}
      {!showProgressScreen && (
        <div className="mobile-only-flex" style={{ alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
          <Link href="/" style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
            color: '#111827',
            textDecoration: 'none'
          }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)',
            fontFamily: "'Outfit', sans-serif"
          }}>
            Create Assignment
          </h1>
        </div>
      )}

      {/* Desktop-only return home link & title header */}
      <div className="desktop-only">
        {!showProgressScreen && (
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            transition: 'color 0.2s',
            fontWeight: 600
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="green-dot-bullet" />
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 700, 
              color: 'var(--text-primary)',
              fontFamily: "'Outfit', sans-serif"
            }}>
              Create Assignment
            </h1>
          </div>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.9rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            Set up a new assignment for your students.
          </p>
        </div>
      </div>

      {/* Stepper segmented bar indicator (left active, right active depending on stage) */}
      <div className="stepper-bar-container">
        <div className="stepper-segment active" />
        <div className={`stepper-segment ${showProgressScreen ? 'active' : ''}`} />
      </div>

      {/* VIEW STATE 1: ASYNC QUEUE TRACKER SCREEN */}
      {showProgressScreen && generationProgress ? (
        <div className="dashboard-card fade-in" style={{
          textAlign: 'center',
          padding: '3.5rem 2rem',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '2rem',
        }}>
          {generationProgress.status === 'FAILED' ? (
            // Generation Failed screen
            <>
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.12)',
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--error)'
              }}>
                <AlertCircle size={36} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                  Generation Failed
                </h2>
                <p style={{ color: 'var(--error)', fontSize: '0.92rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
                  {generationProgress.error || 'The generative model was unable to synthesize response parameters.'}
                </p>
              </div>
              <button onClick={handleResetForm} className="stepper-nav-btn" style={{ background: 'var(--error)', padding: '0.75rem 2rem' }}>
                Adjust Input Parameters & Retry
              </button>
            </>
          ) : generationProgress.status === 'COMPLETED' ? (
            // Success & Redirect screen
            <>
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.12)',
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                  Paper Generated Successfully!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                  Preparing your printable exam paper layout...
                </p>
              </div>
            </>
          ) : (
            // Generation in Progress loading state
            <>
              {/* Vibrant light theme loader */}
              <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  borderRadius: '50%', border: '4px solid rgba(0,0,0,0.03)',
                  borderTop: '4px solid #111827',
                  animation: 'spin 1s linear infinite'
                }} />
                <div style={{
                  position: 'absolute', top: '15px', left: '15px', width: '60px', height: '60px',
                  borderRadius: '50%', border: '3px solid rgba(0,0,0,0.03)',
                  borderBottom: '3px solid #ff5a36',
                  animation: 'spin 1.8s linear infinite reverse'
                }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                  color: '#111827'
                }}>
                  <Sparkles size={24} style={{ animation: 'pulse 1.2s infinite' }} />
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>
                  VedaAI Synthesis Engine
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', height: '24px', fontWeight: 600 }}>
                  {generationProgress.message}
                </p>
              </div>

              {/* Progress Bar slider */}
              <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{
                  width: '100%', height: '8px', background: 'rgba(0,0,0,0.04)',
                  borderRadius: '9999px', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${generationProgress.progress}%`, height: '100%',
                    background: '#111827',
                    borderRadius: '9999px', transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>Queue Job Active</span>
                  <span>{generationProgress.progress}%</span>
                </div>
              </div>
            </>
          )}

        </div>
      ) : (
        
        // VIEW STATE 2: STEPPER CARD FORM
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111827', marginBottom: '0.2rem', fontFamily: "'Outfit', sans-serif" }}>
                Assignment Details
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Basic information about your assignment
              </p>
            </div>

            {validationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.04)',
                border: '1px solid rgba(239, 68, 68, 0.12)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                color: 'var(--error)',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600
              }}>
                <AlertCircle size={18} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Title / Subject Input field */}
            <div className="input-group">
              <label className="input-label" htmlFor="title-field">Assignment Title / Subject</label>
              <input 
                id="title-field"
                type="text" 
                className="input-field" 
                style={{ 
                  borderRadius: '12px', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid transparent',
                  padding: '0.75rem 1rem',
                  fontSize: '0.92rem',
                  fontWeight: 500
                }}
                placeholder="e.g. Mid-Term Physics: Thermodynamics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Drag & Drop File Upload zone matching Mockup */}
            <div className="input-group">
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="dashed-upload-zone"
                style={{
                  border: isDragActive ? '2px dashed #111827 !important' : '2px dashed rgba(0,0,0,0.08)',
                  background: isDragActive ? 'rgba(0,0,0,0.01) !important' : '#ffffff',
                  borderRadius: '16px',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.8rem'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.txt,.jpeg,.png,.jpg"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
                
                <div style={{
                  color: '#111827'
                }}>
                  <Upload size={32} strokeWidth={2} />
                </div>

                {file ? (
                  <div className="fade-in">
                    <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827' }}>
                      {file.name}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Choose a file or drag & drop it here
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontWeight: 600 }}>
                      JPEG, PNG, upto 10MB
                    </p>
                  </div>
                )}

                <button 
                  type="button"
                  style={{
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.45rem 1.2rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#111827',
                    cursor: 'pointer',
                    marginTop: '0.2rem',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Browse Files
                </button>
              </div>
              
              <span style={{ 
                fontSize: '0.82rem', 
                color: 'var(--text-muted)', 
                marginTop: '0.4rem', 
                display: 'block',
                textAlign: 'center',
                fontWeight: 600
              }}>
                Upload images of your preferred document/image
              </span>
            </div>

            {/* Due Date field with Calendar icon inside wrapper */}
            <div className="input-group">
              <label className="input-label" htmlFor="due-date-field">Due Date</label>
              <div className="custom-date-wrapper">
                <input 
                  id="due-date-field"
                  type="date" 
                  className="custom-date-input" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                />
                <CalendarDays 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    right: '1rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: '#52525b',
                    pointerEvents: 'none'
                  }} 
                />
              </div>
            </div>

            {/* Question Type custom table matching Mockup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className="input-label">Question Types Distribution</span>
              
              {/* Desktop-only tabular display */}
              <div className="desktop-only">
                <table className="question-type-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Question Type</th>
                      <th style={{ width: '5%' }}></th>
                      <th style={{ width: '25%' }}>No. of Questions</th>
                      <th style={{ width: '25%' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionRows.map((row) => (
                      <tr key={row.id} className="fade-in">
                        {/* Dropdown selector */}
                        <td>
                          <select
                            className="custom-select"
                            value={row.type}
                            onChange={(e) => handleTypeSelection(row.id, e.target.value)}
                            disabled={isSubmitting}
                          >
                            {availableQuestionTypes.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>

                        {/* Row Delete button */}
                        <td>
                          <button
                            type="button"
                            onClick={() => removeQuestionRow(row.id)}
                            disabled={isSubmitting || questionRows.length <= 1}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '0.3rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <X size={18} />
                          </button>
                        </td>

                        {/* Questions Count stepper steppers */}
                        <td>
                          <div className="stepper-control">
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={isSubmitting || row.count <= 1}
                              onClick={() => updateRowField(row.id, 'count', -1)}
                            >
                              —
                            </button>
                            <span className="stepper-value">{row.count}</span>
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={isSubmitting}
                              onClick={() => updateRowField(row.id, 'count', 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Marks stepper steppers */}
                        <td>
                          <div className="stepper-control">
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={isSubmitting || row.marks <= 1}
                              onClick={() => updateRowField(row.id, 'marks', -1)}
                            >
                              —
                            </button>
                            <span className="stepper-value">{row.marks}</span>
                            <button
                              type="button"
                              className="stepper-btn"
                              disabled={isSubmitting}
                              onClick={() => updateRowField(row.id, 'marks', 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile-only stacked card elements */}
              <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                {questionRows.map((row) => (
                  <div key={row.id} className="question-mobile-card fade-in">
                    
                    {/* Card Top: Dropdown Selector & Remove (X) Icon */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <select
                        className="custom-select"
                        style={{ maxWidth: '85%', padding: '0.5rem 2.2rem 0.5rem 0.75rem', fontSize: '0.88rem' }}
                        value={row.type}
                        onChange={(e) => handleTypeSelection(row.id, e.target.value)}
                        disabled={isSubmitting}
                      >
                        {availableQuestionTypes.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeQuestionRow(row.id)}
                        disabled={isSubmitting || questionRows.length <= 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Card Bottom: Rounded Gray Stepper Wrapper */}
                    <div className="stepper-mobile-card-row">
                      
                      {/* Left stepper: No. of Questions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No. of Questions</span>
                        <div className="stepper-control-mobile">
                          <button
                            type="button"
                            className="stepper-btn-mobile"
                            disabled={isSubmitting || row.count <= 1}
                            onClick={() => updateRowField(row.id, 'count', -1)}
                          >
                            —
                          </button>
                          <span className="stepper-value-mobile">{row.count}</span>
                          <button
                            type="button"
                            className="stepper-btn-mobile"
                            disabled={isSubmitting}
                            onClick={() => updateRowField(row.id, 'count', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Right stepper: Marks */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Marks</span>
                        <div className="stepper-control-mobile">
                          <button
                            type="button"
                            className="stepper-btn-mobile"
                            disabled={isSubmitting || row.marks <= 1}
                            onClick={() => updateRowField(row.id, 'marks', -1)}
                          >
                            —
                          </button>
                          <span className="stepper-value-mobile">{row.marks}</span>
                          <button
                            type="button"
                            className="stepper-btn-mobile"
                            disabled={isSubmitting}
                            onClick={() => updateRowField(row.id, 'marks', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ))}
              </div>

              {/* Add Question Row & Calculations footer row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--glass-border)'
              }}>
                {/* + Add Question Type circular button */}
                <button
                  type="button"
                  onClick={addQuestionRow}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}>
                    <Plus size={14} strokeWidth={3} />
                  </div>
                  <span>Add Question Type</span>
                </button>

                {/* Right aligned sums calculations */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.2rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)'
                }}>
                  <div>
                    <span>Total Questions : </span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem' }}>{totalQuestions}</strong>
                  </div>
                  <div>
                    <span>Total Marks : </span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem' }}>{totalMarks}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Additional Info microphone text area */}
            <div className="input-group" style={{ position: 'relative' }}>
              <label className="input-label" htmlFor="instructions-field">Additional Information (For better output)</label>
              <div style={{ position: 'relative' }}>
                <textarea 
                  id="instructions-field"
                  className="input-field" 
                  rows={4}
                  style={{ 
                    resize: 'none', 
                    fontFamily: 'inherit',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid transparent',
                    borderRadius: '16px',
                    padding: '0.75rem 2.8rem 0.75rem 1rem',
                    fontSize: '0.92rem',
                    fontWeight: 500
                  }}
                  placeholder="e.g Generate a question paper for 3 hour exam duration..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={isSubmitting}
                />
                
                {/* Microphone icon in bottom right */}
                <button
                  type="button"
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    bottom: '1rem',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#52525b',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  title="Speech to Text Input (Simulated)"
                >
                  <Mic size={15} />
                </button>
              </div>
            </div>

          </div>

          {/* Stepper wizard bottom buttons (Previous & Next ->) */}
          <div className="wizard-footer-container">
            {/* Left: Previous (link to home dashboard) */}
            <Link href="/" className="wizard-prev-btn">
              <span>← Previous</span>
            </Link>

            {/* Right: Next -> black pill button */}
            <button 
              type="submit" 
              className="wizard-next-btn"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 2.2rem',
                fontSize: '0.95rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Queuing...</span>
                </>
              ) : (
                <>
                  <span>Next →</span>
                </>
              )}
            </button>
          </div>
          
        </form>
      )}

      {/* Global CSS injected style for loader spins and pulses */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default function CreateAssignment() {
  return (
    <Suspense fallback={
      <div className="container" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' 
      }}>
        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: '#111827' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading VedaAI creation flow...</p>
      </div>
    }>
      <CreateAssignmentForm />
    </Suspense>
  );
}
