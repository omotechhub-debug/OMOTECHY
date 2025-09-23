import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    default: 'Shirt'
  },
  color: {
    type: String,
    required: true,
    default: '#3B82F6'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret._id = ret._id || ret.id;
    return ret;
  }
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category; 