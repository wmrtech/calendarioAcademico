import { ReactNode } from "react";
import { Link } from "wouter";
import { UserIcon } from "@heroicons/react/24/outline";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header Clean */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center h-16 px-4">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
               {/* Logo ou Texto Fallback */}
               <img 
                src="/logo.png" 
                alt="Afya Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
              />
              <h1 className="hidden text-xl font-display font-bold text-primary tracking-tight">
                Afya <span className="text-gray-600 font-semibold">Itajubá</span>
              </h1>
            </div>
          </Link>
          
          <nav>
            <Link href="/admin">
              <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-gray-50">
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Área Administrativa</span>
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-gray-200 bg-white py-8 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-xs text-gray-400 font-medium">
            © {new Date().getFullYear()} Faculdade de Medicina de Itajubá. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}