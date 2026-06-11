export interface PaymentItem {
  id: string;
  title: string;
  amount: number | null;
  isPaid: boolean;
  isRecurring: boolean;
  dueDay: number | null;
  createdAt: number;
}