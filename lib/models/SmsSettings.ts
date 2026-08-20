import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsSettings extends Document {
  key: string;
  provider: string;
  apiKey: string;
  senderIdName: string;
  enabled: boolean;
  dailyReportPhone: string;
  dailyReportEnabled: boolean;
  lastDailyReportDate?: string;
  lastDailyReportAt?: Date;
  lastStockAlertDate?: string;
  lastStockAlertAt?: Date;
  lastDeficitAlertDate?: string;
  lastDeficitAlertAt?: Date;
  lastPendingConfirmationsAlertDate?: string;
  lastPendingConfirmationsAlertAt?: Date;
  lastCashSalesAlertDate?: string;
  lastCashSalesAlertAt?: Date;
  templates?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const SmsSettingsSchema: Schema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'txtlink',
  },
  provider: {
    type: String,
    default: 'txtlink',
  },
  apiKey: {
    type: String,
    default: '',
    trim: true,
  },
  senderIdName: {
    type: String,
    default: '',
    trim: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  dailyReportPhone: {
    type: String,
    default: '',
    trim: true,
  },
  dailyReportEnabled: {
    type: Boolean,
    default: true,
  },
  lastDailyReportDate: {
    type: String,
    default: '',
    trim: true,
  },
  lastDailyReportAt: {
    type: Date,
  },
  lastStockAlertDate: {
    type: String,
    default: '',
    trim: true,
  },
  lastStockAlertAt: {
    type: Date,
  },
  lastDeficitAlertDate: {
    type: String,
    default: '',
    trim: true,
  },
  lastDeficitAlertAt: {
    type: Date,
  },
  lastPendingConfirmationsAlertDate: {
    type: String,
    default: '',
    trim: true,
  },
  lastPendingConfirmationsAlertAt: {
    type: Date,
  },
  lastCashSalesAlertDate: {
    type: String,
    default: '',
    trim: true,
  },
  lastCashSalesAlertAt: {
    type: Date,
  },
  templates: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

if (mongoose.models.SmsSettings) {
  delete mongoose.models.SmsSettings;
}

export default mongoose.model<ISmsSettings>('SmsSettings', SmsSettingsSchema);
