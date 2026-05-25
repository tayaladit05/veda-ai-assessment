import { Request, Response } from 'express';
import Assignment from '../models/Assignment';
import QuestionPaper from '../models/QuestionPaper';
import { assessmentQueue } from '../queues/assessmentQueue';
import pdfParse from 'pdf-parse';

/**
 * Helper to extract text from uploaded files (PDF or plain text).
 */
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  } else if (file.mimetype === 'text/plain') {
    return file.buffer.toString('utf-8');
  }
  throw new Error('Unsupported file type. Please upload a PDF or TXT file.');
}

/**
 * Creates a new assignment, handles optional file upload, and queues AI question generation.
 */
export async function createAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { title, dueDate, questionCount, questionTypes, instructions } = req.body;

    // 1. Validation
    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Assignment title is required.' });
      return;
    }

    if (!dueDate) {
      res.status(400).json({ error: 'Due date is required.' });
      return;
    }

    const parsedCount = parseInt(questionCount, 10);
    if (isNaN(parsedCount) || parsedCount <= 0) {
      res.status(400).json({ error: 'Number of questions must be a positive integer.' });
      return;
    }

    // Question types can be passed as JSON string from multipart/form-data
    let parsedTypes: string[] = [];
    if (typeof questionTypes === 'string') {
      try {
        parsedTypes = JSON.parse(questionTypes);
      } catch {
        parsedTypes = [questionTypes];
      }
    } else if (Array.isArray(questionTypes)) {
      parsedTypes = questionTypes;
    }

    if (!parsedTypes || parsedTypes.length === 0) {
      res.status(400).json({ error: 'At least one question type must be selected.' });
      return;
    }

    // 2. Parse file text if uploaded
    let fileText = '';
    if (req.file) {
      try {
        fileText = await extractTextFromFile(req.file);
        console.log(`Successfully extracted ${fileText.length} characters from uploaded file: ${req.file.originalname}`);
      } catch (err: any) {
        console.error('Error parsing uploaded file:', err);
        res.status(400).json({ error: `File upload parsing failed: ${err.message}` });
        return;
      }
    }

    // 3. Save Assignment to DB (status is initially PENDING)
    const assignment = await Assignment.create({
      title: title.trim(),
      dueDate: new Date(dueDate),
      questionCount: parsedCount,
      questionTypes: parsedTypes,
      instructions: instructions ? instructions.trim() : '',
      status: 'PENDING',
      fileText: fileText || undefined,
    });

    // 4. Queue background generation job
    await assessmentQueue.add(
      'generate-questions',
      { assignmentId: assignment._id.toString() },
      { removeOnComplete: true, removeOnFail: false }
    );

    console.log(`Queued AI generation for assignment ID: ${assignment._id}`);

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'An unexpected internal server error occurred.' });
  }
}

/**
 * Retrieves all assignments for dashboard display.
 */
export async function getAssignments(req: Request, res: Response): Promise<void> {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'An unexpected error occurred while fetching assignments.' });
  }
}

/**
 * Retrieves a specific assignment by ID.
 */
export async function getAssignmentById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }
    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'An unexpected error occurred while fetching the assignment.' });
  }
}

/**
 * Retrieves the generated question paper for a given assignment.
 */
export async function getQuestionPaper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const paper = await QuestionPaper.findOne({ assignmentId: id });
    if (!paper) {
      res.status(404).json({ error: 'Question paper not found for this assignment.' });
      return;
    }
    res.json(paper);
  } catch (error) {
    console.error('Error fetching question paper:', error);
    res.status(500).json({ error: 'An unexpected error occurred while fetching the question paper.' });
  }
}

/**
 * Triggers a regeneration of questions for a specific assignment.
 */
export async function regenerateQuestionPaper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // Update status to PENDING
    assignment.status = 'PENDING';
    await assignment.save();

    // Queue another generation job
    await assessmentQueue.add(
      'generate-questions',
      { assignmentId: assignment._id.toString() },
      { removeOnComplete: true, removeOnFail: false }
    );

    console.log(`Queued regeneration for assignment ID: ${assignment._id}`);

    res.json({ message: 'Regeneration job successfully queued.', assignment });
  } catch (error) {
    console.error('Error regenerating question paper:', error);
    res.status(500).json({ error: 'An unexpected error occurred while queuing regeneration.' });
  }
}

/**
 * Deletes a specific assignment and its generated question paper from the database.
 */
export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // 1. Delete assignment from MongoDB
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found.' });
      return;
    }

    // 2. Delete any generated question paper for this assignment
    await QuestionPaper.findOneAndDelete({ assignmentId: id });

    console.log(`Deleted assignment ID: ${id} and its associated question paper.`);
    res.json({ message: 'Assignment and associated question paper deleted successfully.' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'An unexpected error occurred while deleting the assignment.' });
  }
}

