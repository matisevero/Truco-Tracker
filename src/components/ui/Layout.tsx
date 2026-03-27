import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart2, Users, History, LogOut, Settings } from 'lucide-react';
import { auth, signInWithGoogle, logOut, signInAsGuest } from '../../firebase';
import { useAuthState } from '../../hooks/useAuthState';

const PartidoIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.272,22.414l4.2-4.2.929.93a1,1,0,1,0,1.414-1.414l-.774-.775,8.8-5.869a1,1,0,0,0,.445-.832V3.707a1,1,0,0,0-1-1H13.747a1,1,0,0,0-.832.445l-5.869,8.8-.774-.774A1,1,0,1,0,4.858,12.6l.93.93-4.2,4.2a1,1,0,0,0,0,1.414l3.272,3.272A1,1,0,0,0,6.272,22.414Zm8.01-17.707h5.011v5.01L10.6,15.511c-.1-.1-2.25-2.25-2.113-2.113ZM7.2,14.94,9.06,16.8l-3.495,3.5L3.707,18.435Z"></path>
  </svg>
);

export default function Layout() {
  const { user, loading } = useAuthState();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-pulperia-bg">Cargando...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pulperia-bg p-4">
        <div className="max-w-md w-full card-espanola p-8 text-center fileteado-border">
          <h1 className="text-4xl font-bold text-pulperia-red mb-2 font-serif">Truco Tracker</h1>
          <p className="text-pulperia-ink/70 mb-8 font-serif italic">Inicia sesión para registrar tus partidos y ver estadísticas.</p>
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              className="w-full bg-pulperia-red text-white rounded-xl py-3 px-4 font-bold hover:bg-red-800 transition-colors shadow-md"
            >
              Iniciar sesión con Google
            </button>
            <button
              onClick={signInAsGuest}
              className="w-full bg-transparent border-2 border-pulperia-red text-pulperia-red rounded-xl py-3 px-4 font-bold hover:bg-pulperia-red/10 transition-colors"
            >
              Continuar como invitado
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: 'Partido', icon: PartidoIcon },
    { path: '/stats', label: 'Estadísticas', icon: BarChart2 },
    { path: '/players', label: 'Jugadores', icon: Users },
    { path: '/history', label: 'Historial', icon: History },
    { path: '/settings', label: 'Perfil', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-pulperia-bg flex flex-col md:flex-row">
      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-pulperia-card border-t border-pulperia-border z-50 flex justify-around p-2 pb-safe shadow-[0_-4px_12px_rgba(44,42,41,0.05)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-lg ${
                isActive ? 'text-pulperia-red' : 'text-pulperia-ink/40'
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] mt-1 font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-pulperia-card border-r border-pulperia-border fixed h-full shadow-lg">
        <div className="p-6 text-center border-b border-pulperia-border/50">
          <h1 className="text-3xl font-bold text-pulperia-red font-serif">Truco Tracker</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-pulperia-red/10 text-pulperia-red font-bold' : 'text-pulperia-ink/60 hover:bg-pulperia-bg'
                }`}
              >
                <Icon size={20} />
                <span className="font-serif text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-pulperia-border">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-3 overflow-hidden">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || 'Invitado')}`} alt="" className="w-8 h-8 rounded-full border border-pulperia-gold bg-pulperia-bg" />
              <span className="text-sm font-bold text-pulperia-ink truncate">{user.isAnonymous ? 'Invitado' : user.displayName}</span>
            </div>
            <button onClick={logOut} className="text-pulperia-ink/40 hover:text-pulperia-red transition-colors" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
