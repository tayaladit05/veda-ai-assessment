import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionText: string;
  type: string;
  options?: string[]; // MCQs
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  marks: number;
}

export interface ISection {
  title: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IQuestionPaper extends Document {
  assignmentId: mongoose.Types.ObjectId;
  sections: ISection[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema: Schema = new Schema({
  questionText: { type: String, required: true },
  type: { type: String, required: true },
  options: { type: [String] },
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Hard'],
    required: true,
  },
  marks: { type: Number, required: true, min: 1 },
});

const SectionSchema: Schema = new Schema({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questions: { type: [QuestionSchema], required: true },
});

const QuestionPaperSchema: Schema = new Schema(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      unique: true,
    },
    sections: { type: [SectionSchema], required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IQuestionPaper>('QuestionPaper', QuestionPaperSchema);
