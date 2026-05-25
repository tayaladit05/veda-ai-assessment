import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  dueDate: Date;
  instructions?: string;
  questionCount: number;
  questionTypes: string[];
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  fileText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    instructions: { type: String },
    questionCount: { type: Number, required: true, min: 1 },
    questionTypes: { type: [String], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'GENERATING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    fileText: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
