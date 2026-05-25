import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import multer from 'multer';
import { connectDB } from './config/db';
import { socketManager } from './sockets/socketManager';
import { initAssessmentWorker } from './workers/assessmentWorker';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  getQuestionPaper,
  regenerateQuestionPaper,
  deleteAssignment,
} from './controllers/assessmentController';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Multer in-memory storage configuration for optional text/PDF file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit uploads to 10MB
  },
});

// Middleware setup
app.use(cors({ origin: '*' })); // Permit cross-origin requests from any frontend port
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST API Route Definitions
app.get('/api/assignments', getAssignments);
app.get('/api/assignments/:id', getAssignmentById);
app.get('/api/assignments/:id/paper', getQuestionPaper);
app.post('/api/assignments/:id/regenerate', regenerateQuestionPaper);
app.delete('/api/assignments/:id', deleteAssignment);


// File Upload endpoint registers Multer middleware
app.post('/api/assignments', upload.single('file'), createAssignment);

// Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'VedaAI Assessment Creator API is running smoothly.' });
});

/**
 * Boots the server and all backing services.
 */
async function bootstrap() {
  console.log('Bootstrapping VedaAI Assessment Creator Backend...');
  
  // 1. Establish database connection
  await connectDB();

  // 2. Attach WebSocket server onto the HTTP server
  socketManager.init(server);
  console.log('WebSocket Server mounted on HTTP interface.');

  // 3. Launch background queues workers
  initAssessmentWorker();

  // 4. Listen on configured port
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server executing in production-ready mode.`);
    console.log(`🔌 HTTP API running at http://localhost:${PORT}`);
    console.log(`🔌 WS Server running at ws://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal failure bootstrapping Express Application:', err);
  process.exit(1);
});
