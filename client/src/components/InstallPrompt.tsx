import { useState, useEffect } from "react";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Escuta o evento do navegador que diz "Este site pode ser instalado"
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Verifica se já foi dispensado antes (opcional, aqui mostramos sempre para testar)
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
               <img src="/logo.png" alt="Afya" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h4 className="font-display font-bold text-gray-900 text-sm">Instalar Aplicativo</h4>
              <p className="text-xs text-gray-500 mt-0.5">Acesse o calendário direto da tela inicial.</p>
            </div>
          </div>
          <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <Button onClick={handleInstallClick} className="neo-btn w-full flex items-center justify-center gap-2 h-9 text-xs">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Adicionar à Tela Inicial
        </Button>
      </div>
    </div>
  );
}