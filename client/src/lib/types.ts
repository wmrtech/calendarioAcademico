import { Timestamp } from "firebase/firestore";

// --- CATEGORIAS E CONFIGURAÇÕES VISUAIS ---
export interface Category {
  id: string;
  label: string;
  color: string;
  text: string;
  border: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

// --- EVENTOS (AGENDA) ---
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

// --- CONSTANTES ---
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
  // Adicionado categorias úteis para eventos acadêmicos
  exam: { id: 'exam', label: 'Prova', color: 'bg-pink-600', text: 'text-white', border: 'border-pink-800' },
  class: { id: 'class', label: 'Aula', color: 'bg-blue-600', text: 'text-white', border: 'border-blue-800' },
};

// --- NOTIFICAÇÕES ---
export type NotificationType = 'info' | 'warning' | 'urgent';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  targetPeriods: string[]; // Ex: ['1', '2'] ou ['all']
  createdAt: Timestamp;
}

// --- FUNCIONÁRIOS (EMPLOYEES) ---
// Alterado para string para aceitar cargos do RH (Docente, Adm) vindos do formulário
export type EmployeeRole = string; 

export interface Employee {
  id: string;
  name: string;
  email?: string; // Opcional (não pedimos no cadastro público)
  phone: string;
  role: EmployeeRole; // Cargo Oficial (RH)
  experienceLevel?: 1 | 2 | 3 | 4 | 5; // Opcional (definido pelo admin depois)
  isActive: boolean;
  
  // NOVOS CAMPOS (Vindos da Página de Captura)
  availability?: string[]; // ["Manhã", "Tarde", "Noite"]
  notes?: string;          // Observações de horário
  status?: 'active' | 'pending' | 'inactive'; // Para triagem
  
  createdAt?: any;
}

// --- SALAS ---
export interface Room {
  id: string;
  name: string; // Ex: "Sala 101", "Auditório Master"
  block: string; // Ex: "Bloco A"
  capacity: number;
  features: string[]; // Ex: ["Ar Condicionado", "Projetor"]
  isActive: boolean;
  createdAt?: any;
}

// --- DISPONIBILIDADE (Legado ou Específica) ---
export interface Availability {
  id: string;
  examId: string;
  employeeId: string;
  employeeName: string;
  isAvailable: boolean;
  updatedAt: any;
}

// --- PROVAS (EXAMS) ---
export type ExamStatus = 'draft' | 'availability_open' | 'allocating' | 'closed';

export interface Exam {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  type: string; // Ex: "Regular", "Recuperação"
  studentCountEstimate: number;
  status: ExamStatus;
  targetPeriods: string[];
  instructions?: string;
  createdAt: any;
}

// --- ALOCAÇÃO ---
export interface Allocation {
  id: string;
  examId: string;
  roomId: string;
  employeeIds: string[]; // Lista de IDs dos funcionários nesta sala
  period?: string;       // Qual período (1º, 2º...) fará prova nesta sala
  studentCount?: number;
  updatedAt: any;
}

// --- OCORRÊNCIAS ---
export type OccurrenceType = 'positive' | 'negative' | 'neutral';

export interface Occurrence {
  id: string;
  examId: string;
  type: OccurrenceType;
  title: string;
  description: string;
  employeeId?: string;
  employeeName?: string;
  createdAt: any;
}

export type ReenrollmentStatus = 'pending' | 'analyzing' | 'approved' | 'rejected';

export interface ReenrollmentRequest {
  id: string;
  studentName: string;
  cpf: string;
  phone: string;
  currentPeriod: string;
  subjects: string; // Texto livre descrevendo as matérias
  status: ReenrollmentStatus;
  createdAt: any;
}