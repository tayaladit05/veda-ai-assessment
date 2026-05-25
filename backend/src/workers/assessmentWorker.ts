import { Worker, Job } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis';
import Assignment from '../models/Assignment';
import QuestionPaper from '../models/QuestionPaper';
import { generateQuestionPaper } from '../services/geminiService';
import { socketManager } from '../sockets/socketManager';

const connectionOptions = getRedisConnectionOptions();

// Helper to wait a short time to simulate and space out stages for smooth UI animation
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initAssessmentWorker(): void {
  const worker = new Worker(
    'assessment-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`[Worker] Started processing assignment job for ID: ${assignmentId}`);

      try {
        // 1. Fetch assignment
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
          throw new Error(`Assignment with ID ${assignmentId} not found.`);
        }

        // 2. Transition status to GENERATING
        assignment.status = 'GENERATING';
        await assignment.save();

        // Broadcast initial generation status
        socketManager.broadcast(assignmentId, {
          type: 'PROGRESS',
          status: 'GENERATING',
          progress: 15,
          message: assignment.fileText 
            ? 'Analyzing and parsing uploaded source document text...' 
            : 'Formulating structured request parameters...',
        });
        await delay(1200);

        // Stage 2: Prompt engineering and context synthesis
        socketManager.broadcast(assignmentId, {
          type: 'PROGRESS',
          status: 'GENERATING',
          progress: 40,
          message: 'Synthesizing educational constraints & designing structured prompts...',
        });
        await delay(1200);

        // Stage 3: Querying LLM / Generator
        socketManager.broadcast(assignmentId, {
          type: 'PROGRESS',
          status: 'GENERATING',
          progress: 70,
          message: 'Querying VedaAI generative engines for custom question distributions...',
        });

        // 3. Perform generation
        const sections = await generateQuestionPaper(
          assignment.title,
          assignment.instructions || '',
          assignment.questionCount,
          assignment.questionTypes,
          assignment.fileText
        );

        // Stage 4: Formatting and database insertion
        socketManager.broadcast(assignmentId, {
          type: 'PROGRESS',
          status: 'GENERATING',
          progress: 90,
          message: 'Verifying structured answers and packaging exam paper into sections...',
        });
        await delay(800);

        // 4. Save QuestionPaper
        const existingPaper = await QuestionPaper.findOne({ assignmentId });
        let questionPaper;

        if (existingPaper) {
          existingPaper.sections = sections;
          questionPaper = await existingPaper.save();
        } else {
          questionPaper = await QuestionPaper.create({
            assignmentId,
            sections,
          });
        }

        // 5. Update Assignment status to COMPLETED
        assignment.status = 'COMPLETED';
        await assignment.save();

        console.log(`[Worker] Assignment ${assignmentId} generation completed successfully!`);

        // Broadcast final completion with the generated paper data
        socketManager.broadcast(assignmentId, {
          type: 'COMPLETED',
          status: 'COMPLETED',
          progress: 100,
          message: 'Question paper generated successfully!',
          data: questionPaper,
        });

      } catch (error: any) {
        console.error(`[Worker] Error generating question paper for assignment ${assignmentId}:`, error);

        // Update Assignment to FAILED
        try {
          await Assignment.findByIdAndUpdate(assignmentId, { status: 'FAILED' });
        } catch (dbErr) {
          console.error('[Worker] Failed to mark assignment as FAILED in database:', dbErr);
        }

        // Broadcast failure
        socketManager.broadcast(assignmentId, {
          type: 'FAILED',
          status: 'FAILED',
          progress: 0,
          error: error.message || 'An unexpected error occurred during AI question generation.',
        });

        throw error;
      }
    },
    {
      connection: connectionOptions,
      concurrency: 2, // Process up to 2 jobs concurrently
    }
  );

  worker.on('active', (job) => {
    console.log(`[Worker] Job ${job.id} active.`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  console.log('BullMQ assessmentWorker initialized.');
}
