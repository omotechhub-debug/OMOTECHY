import mongoose from 'mongoose';

export interface ITestimonial {
  name: string;
  role?: string;
  content: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  image?: string;
  email?: string;
  phone?: string;
  gender: 'male' | 'female';
}

const testimonialSchema = new mongoose.Schema<ITestimonial>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  role: {
    type: String,
    trim: true,
    maxlength: [100, 'Role cannot exceed 100 characters'],
  },
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    trim: true,
    minlength: [10, 'Testimonial must be at least 10 characters'],
    maxlength: [1000, 'Testimonial cannot exceed 1000 characters'],
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    default: '/placeholder.svg',
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters'],
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female'],
  },
}, {
  timestamps: true,
});

// Index for better query performance
testimonialSchema.index({ status: 1, submittedAt: -1 });
testimonialSchema.index({ rating: -1 });

const Testimonial = mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', testimonialSchema);

export default Testimonial; 