import { create } from 'zustand';

export interface Assignment {
  _id: string;
  title: string;
  dueDate: string;
  instructions?: string;
  questionCount: number;
  questionTypes: string[];
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  questionText: string;
  type: string;
  options?: string[];
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
}

export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionPaper {
  _id: string;
  assignmentId: string;
  sections: Section[];
  createdAt: string;
}

interface GenerationProgress {
  progress: number;
  message: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

interface AssessmentState {
  // Data lists
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  activePaper: QuestionPaper | null;
  
  // App UI states
  isLoading: boolean;
  theme: 'dark' | 'light';
  
  // Real-time generation trackers
  generationProgress: GenerationProgress | null;
  wsConnection: WebSocket | null;

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  fetchAssignments: () => Promise<void>;
  fetchAssignmentById: (id: string) => Promise<Assignment | null>;
  fetchQuestionPaper: (assignmentId: string) => Promise<void>;
  createAssignment: (formData: FormData) => Promise<Assignment>;
  regeneratePaper: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  
  // WebSocket actions
  connectWebSocket: (assignmentId: string, onCompleteCallback?: () => void) => void;
  disconnectWebSocket: () => void;
  resetGenerationProgress: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assignments: [],
  activeAssignment: null,
  activePaper: null,
  isLoading: false,
  theme: 'light',
  generationProgress: null,
  wsConnection: null,

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  fetchAssignments: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/assignments');
      if (!response.ok) throw new Error('Failed to fetch assignments.');
      const data = await response.json();
      set({ assignments: data });
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAssignmentById: async (id) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/assignments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch assignment.');
      const data = await response.json();
      set({ activeAssignment: data });
      return data;
    } catch (err) {
      console.error(`Error fetching assignment ${id}:`, err);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuestionPaper: async (assignmentId) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/assignments/${assignmentId}/paper`);
      if (!response.ok) {
        set({ activePaper: null });
        return;
      }
      const data = await response.json();
      set({ activePaper: data });
    } catch (err) {
      console.error(`Error fetching question paper for assignment ${assignmentId}:`, err);
      set({ activePaper: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createAssignment: async (formData) => {
    set({ isLoading: true, generationProgress: { status: 'PENDING', progress: 5, message: 'Creating assignment on server...' } });
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMsg = 'Server rejected assignment creation.';
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errMsg = errorData.error || errMsg;
        } catch (e) {
          try {
            const txt = await responseClone.text();
            if (txt.includes('<!DOCTYPE') || txt.includes('<html')) {
              errMsg = 'Next.js Proxy failed to communicate with the API. Is the backend Express server running on port 5001?';
            } else {
              errMsg = txt || errMsg;
            }
          } catch (e2) {}
        }
        throw new Error(errMsg);
      }

      let assignment: Assignment;
      try {
        assignment = await response.json();
      } catch (jsonErr) {
        throw new Error('Server returned invalid JSON. Please check if the backend is running and healthy.');
      }
      
      // Update local lists
      set((state) => ({
        assignments: [assignment, ...state.assignments],
        activeAssignment: assignment,
        generationProgress: {
          status: 'PENDING',
          progress: 10,
          message: 'Assignment created successfully! Connecting to queue dispatcher...',
        }
      }));

      return assignment;
    } catch (err: any) {
      set({ 
        generationProgress: { 
          status: 'FAILED', 
          progress: 0, 
          message: 'Failed to create assignment', 
          error: err.message || 'Unknown network error' 
        } 
      });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  regeneratePaper: async (id) => {
    set({ 
      activePaper: null,
      generationProgress: { 
        status: 'PENDING', 
        progress: 10, 
        message: 'Regeneration request submitted...' 
      } 
    });

    try {
      const response = await fetch(`/api/assignments/${id}/regenerate`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Regeneration failed.');
      
      const data = await response.json();
      set({ activeAssignment: data.assignment });
    } catch (err: any) {
      set({ 
        generationProgress: { 
          status: 'FAILED', 
          progress: 0, 
          message: 'Failed to queue regeneration', 
          error: err.message || 'Unknown error' 
        } 
      });
      throw err;
    }
  },

  connectWebSocket: (assignmentId, onCompleteCallback) => {
    // Clean up existing socket connection first
    get().disconnectWebSocket();

    // Determine secure or standard ws protocol based on location
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // During local development, the Next.js client connects to backend port 5001 directly.
    const wsUrl = `${wsProto}//${window.location.hostname}:5001`;
    
    console.log(`Connecting WebSocket to: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket client connected. Joining room:', assignmentId);
      socket.send(JSON.stringify({
        type: 'JOIN',
        assignmentId,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket event:', message);

        if (message.type === 'SUBSCRIBED') {
          set({
            generationProgress: {
              status: 'PENDING',
              progress: 15,
              message: 'Joined background queue observer channel...',
            }
          });
        }

        if (message.type === 'PROGRESS') {
          set({
            generationProgress: {
              status: 'GENERATING',
              progress: message.progress,
              message: message.message,
            }
          });
        }

        if (message.type === 'COMPLETED') {
          set({
            activePaper: message.data,
            generationProgress: {
              status: 'COMPLETED',
              progress: 100,
              message: message.message,
            }
          });
          
          // Trigger refresh of list in background
          get().fetchAssignments();

          if (onCompleteCallback) {
            onCompleteCallback();
          }
        }

        if (message.type === 'FAILED') {
          set({
            generationProgress: {
              status: 'FAILED',
              progress: 0,
              message: 'AI Generation Failed',
              error: message.error || 'Generative Model failed to formulate sections.',
            }
          });
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket closed.');
      set({ wsConnection: null });
    };

    socket.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
    };

    set({ wsConnection: socket });
  },

  disconnectWebSocket: () => {
    const { wsConnection } = get();
    if (wsConnection) {
      wsConnection.close();
      set({ wsConnection: null });
    }
  },

  resetGenerationProgress: () => {
    set({ generationProgress: null });
  },

  deleteAssignment: async (id) => {
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete assignment.');
      set((state) => ({
        assignments: state.assignments.filter((a) => a._id !== id),
      }));
    } catch (err) {
      console.error(`Error deleting assignment ${id}:`, err);
    }
  }
}));
