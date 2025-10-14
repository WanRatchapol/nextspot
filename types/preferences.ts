import { z } from 'zod';

export const BudgetBandSchema = z.enum(['low', 'mid', 'high']);
export const TimeWindowSchema = z.enum(['evening', 'halfday', 'fullday']);
export const MoodTagSchema = z.enum(['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic']);

export const PreferencesSchema = z.object({
  budgetBand: BudgetBandSchema,
  moodTags: z.array(MoodTagSchema).min(1, 'เลือกอารมณ์อย่างน้อย 1 อย่าง'),
  timeWindow: TimeWindowSchema,
});

export type BudgetBand = z.infer<typeof BudgetBandSchema>;
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
export type MoodTag = z.infer<typeof MoodTagSchema>;
export type UserPreferences = z.infer<typeof PreferencesSchema>;

export interface MoodOption {
  id: MoodTag;
  labelThai: string;
  labelEng: string;
  icon: string;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'chill',
    labelThai: 'ชิลๆ',
    labelEng: 'Chill',
    icon: '😌',
    description: 'ผ่อนคลาย ไม่เร่งรีบ'
  },
  {
    id: 'adventure',
    labelThai: 'ผจญภัย',
    labelEng: 'Adventure',
    icon: '🏔️',
    description: 'ตื่นเต้น เสียงดัง'
  },
  {
    id: 'foodie',
    labelThai: 'กิน',
    labelEng: 'Foodie',
    icon: '🍜',
    description: 'หาของอร่อย'
  },
  {
    id: 'cultural',
    labelThai: 'วัฒนธรรม',
    labelEng: 'Cultural',
    icon: '🏛️',
    description: 'เรียนรู้ ประวัติศาสตร์'
  },
  {
    id: 'social',
    labelThai: 'สังคม',
    labelEng: 'Social',
    icon: '👥',
    description: 'พบปะเพื่อน'
  },
  {
    id: 'romantic',
    labelThai: 'โรแมนติก',
    labelEng: 'Romantic',
    icon: '💕',
    description: 'อบอุ่น หวานใส'
  }
];

export const BUDGET_OPTIONS = [
  {
    id: 'low' as BudgetBand,
    labelThai: 'ประหยัด',
    labelEng: 'Low Budget',
    range: '฿0-500',
    description: 'งบน้อย ประหยัด'
  },
  {
    id: 'mid' as BudgetBand,
    labelThai: 'ปานกลาง',
    labelEng: 'Mid Budget',
    range: '฿500-1,500',
    description: 'งบปานกลาง'
  },
  {
    id: 'high' as BudgetBand,
    labelThai: 'หรูหรา',
    labelEng: 'High Budget',
    range: '฿1,500+',
    description: 'งบเยอะ ฟินๆ'
  }
];

export const TIME_OPTIONS = [
  {
    id: 'evening' as TimeWindow,
    labelThai: 'เย็นๆ',
    labelEng: 'Evening',
    duration: '2-3 ชม.',
    description: 'หลังเลิกเรียน'
  },
  {
    id: 'halfday' as TimeWindow,
    labelThai: 'ครึ่งวัน',
    labelEng: 'Half Day',
    duration: '4-5 ชม.',
    description: 'เช้า หรือบ่าย'
  },
  {
    id: 'fullday' as TimeWindow,
    labelThai: 'เต็มวัน',
    labelEng: 'Full Day',
    duration: '6+ ชม.',
    description: 'ทั้งวันเลย'
  }
];