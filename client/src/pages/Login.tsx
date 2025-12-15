import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockClosedIcon, EnvelopeIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      setLocation("/admin/dashboard");
    } catch (err) {
      setError("Falha ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md">
        
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
            <img 
                src="/logo.png" 
                alt="Afya Faculdade de Medicina" 
                className="h-16 w-auto object-contain"
                onError={(e) => {
                    // Fallback visual se a imagem falhar
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
            />
            <div className="hidden flex flex-col items-center">
                <h1 className="text-3xl font-display font-bold text-primary tracking-tight">Afya</h1>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Itajubá</span>
            </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Acesso Administrativo</h2>
            <p className="text-sm text-gray-500 mt-1"></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                 <span className="font-bold">Erro:</span> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-500 ml-1">Email Institucional</Label>
              <div className="relative">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neo-input pl-10 h-11"
                  placeholder="admin@afya.com.br"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase text-gray-500 ml-1">Senha</Label>
              <div className="relative">
                <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neo-input pl-10 h-11"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 text-base bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? 'Entrando...' : (
                  <span className="flex items-center gap-2">
                      Acessar Painel <ArrowRightIcon className="w-4 h-4 stroke-[3px]" />
                  </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
             <a href="/" className="text-sm font-semibold text-gray-400 hover:text-primary transition-colors">
                ← Voltar para o Calendário
             </a>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Afya Faculdade de Medicina. Área restrita.
        </p>
      </div>
    </div>
  );
}