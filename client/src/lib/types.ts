import { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  label: string;
  color: string;
  text: string;
  border: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Event {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time: string;
  endTime?: string;
  
  originalId?: string;
  originalStartDate?: string;
  originalEndDate?: string;
  
  recurrence?: {
    type: RecurrenceType;
    until?: string;
  };
  targetPeriods?: string[];

  category: string;
  course?: string;
  description?: string;
  local?: string;
  link?: string;
  allDay: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ATUALIZADO: Apenas Ciclo Básico e Clínico (1º ao 8º)
export const ACADEMIC_PERIODS = [
  { id: '1', label: '1º Período' },
  { id: '2', label: '2º Período' },
  { id: '3', label: '3º Período' },
  { id: '4', label: '4º Período' },
  { id: '5', label: '5º Período' },
  { id: '6', label: '6º Período' },
  { id: '7', label: '7º Período' },
  { id: '8', label: '8º Período' },
];

export const DEFAULT_CATEGORIES: Record<string, Category> = {
  science: { id: 'science', label: 'Ciências', color: 'bg-blue-500', text: 'text-white', border: 'border-blue-700' },
  arts: { id: 'arts', label: 'Artes', color: 'bg-red-500', text: 'text-white', border: 'border-red-700' },
  humanities: { id: 'humanities', label: 'Humanas', color: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-600' },
  technology: { id: 'technology', label: 'Tecnologia', color: 'bg-purple-500', text: 'text-white', border: 'border-purple-700' },
  general: { id: 'general', label: 'Geral', color: 'bg-gray-200', text: 'text-black', border: 'border-gray-400' },
};

export type NotificationType = 'info' | 'warning' | 'urgent';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  targetPeriods: string[]; // Ex: ['1', '2'] ou ['all']
  createdAt: Timestamp;
}