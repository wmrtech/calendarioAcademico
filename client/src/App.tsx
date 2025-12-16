import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Registries from "@/pages/Registries";
import Exams from "@/pages/Exams";
import PublicAvailability from "@/pages/PublicAvailability";
import ExamDetails from "@/pages/ExamDetails";
import PublicBoard from "@/pages/PublicBoard";
import StudentBoard from "@/pages/StudentBoard";
import PublicRegistration from "@/pages/PublicRegistration";
import PublicEnsalamento from "@/pages/PublicEnsalamento";
import PublicExamSelection from "@/pages/PublicExamSelection";
import PublicReenrollment from "@/pages/PublicReenrollment";
import ReenrollmentManager from "@/pages/admin/ReenrollmentManager";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/availability"} component={PublicAvailability} />
      <Route path={"/admin"} component={Login} />
      <Route path={"/admin/dashboard"} component={Dashboard} />
      
      {/* ADICIONAR NOVAS ROTAS AQUI: */}
      <Route path={"/admin/registries"} component={Registries} />
      <Route path={"/admin/exams"} component={Exams} />
      <Route path={"/admin/exams/:id"} component={ExamDetails} />
      <Route path={"/board/:id"} component={PublicBoard} />
      <Route path="/student-board/:id" component={StudentBoard} />
      <Route path="/registro-fiscal/:examId" component={PublicRegistration} />
      <Route path="/ensalamento/:id" component={PublicEnsalamento} />
      <Route path="/portal-reprografia" component={PublicExamSelection} />
      <Route path="/solicitacao-rematricula" component={PublicReenrollment} />
      <Route path="/admin/reenrollment" component={ReenrollmentManager} />
      
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

export type ExamStatus = 'draft' | 'availability_open' | 'allocating' | 'closed';

export interface Exam {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  type: string; // Ex: "P1", "Recuperação", "Integrada"
  studentCountEstimate: number;
  status: ExamStatus;
  createdAt: any;
}