import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { ISection } from '../models/QuestionPaper';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// Initialize Google Generative AI only if api key is provided
let genAI: any = null;
if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.error('Failed to initialize GoogleGenerativeAI SDK:', err);
  }
}

/**
 * Builds a structured Gemini AI Prompt requesting JSON output.
 */
function buildGeminiPrompt(
  title: string,
  instructions: string,
  questionCount: number,
  questionTypes: string[],
  fileText?: string
): string {
  return `
You are an elite academic curriculum designer and expert educator. Your task is to generate a professional, highly coherent Question Paper for an exam or assignment.

Here are the assignment details:
- **Title/Topic**: "${title}"
- **Instructions**: "${instructions || 'None provided.'}"
- **Total Questions to generate**: ${questionCount}
- **Required Question Types**: ${questionTypes.join(', ')}

${fileText ? `
Here is contextual textbook content or source material extracted from an uploaded document. You MUST base your questions on this source text:
---
${fileText}
---
` : ''}

Generate exactly ${questionCount} questions in total.
Distribute the questions logically into academic sections (e.g. "Section A: Multiple Choice Questions", "Section B: Short Answer Questions").
Assign a difficulty tag ('Easy', 'Moderate', or 'Hard') and reasonable 'marks' (e.g. MCQ=1-2 marks, Short Answer=3-5 marks, Long Answer=8-10 marks) to each question.

You MUST respond strictly in the following JSON schema format:
{
  "sections": [
    {
      "title": "Section Title (e.g. Section A: Multiple Choice Questions)",
      "instruction": "Instructions for this section (e.g. Select the correct option. Attempt all questions.)",
      "questions": [
        {
          "questionText": "The text of the question?",
          "type": "Must be one of the requested types (MCQ, Short Answer, Long Answer, True/False)",
          "options": ["Option A", "Option B", "Option C", "Option D"], // Provide only for MCQ or True/False (["True", "False"])
          "difficulty": "Easy, Moderate, or Hard",
          "marks": 5 // Integer marks
        }
      ]
    }
  ]
}

DO NOT include any markdown wrapper or explanation. Return ONLY the raw JSON string. Ensure the JSON is syntactically valid and compiles perfectly.
`;
}

/**
 * Generates structured question papers using Gemini AI.
 */
export async function generateQuestionPaper(
  title: string,
  instructions: string = '',
  questionCount: number,
  questionTypes: string[],
  fileText?: string
): Promise<ISection[]> {
  if (!genAI) {
    throw new Error('Google Generative AI is not initialized. Please configure a valid GEMINI_API_KEY in your environment variables.');
  }

  try {
    console.log(`[AI Mode] Generating questions via Gemini AI for: "${title}"`);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = buildGeminiPrompt(title, instructions, questionCount, questionTypes, fileText);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up text if it contains markdown formatting blocks
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    cleanText = cleanText.trim();

    const parsed = JSON.parse(cleanText);
    if (parsed && Array.isArray(parsed.sections)) {
      console.log(`[AI Mode] Successfully generated ${parsed.sections.reduce((acc: number, s: any) => acc + s.questions.length, 0)} questions!`);
      return parsed.sections;
    }
    throw new Error('Parsed AI response does not contain a valid sections array.');
  } catch (err: any) {
    console.error('[AI Mode] Gemini Generation failed:', err);
    throw new Error(`Gemini AI generation failed: ${err.message || err}`);
  }
}
