import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart2, Users, History, LogOut, Settings } from 'lucide-react';
import { signInWithGoogle, logOut, signInAsGuest } from '../../firebase';
import { useAuthState } from '../../hooks/useAuthState';

const SpadaIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.272,22.414l4.2-4.2.929.93a1,1,0,1,0,1.414-1.414l-.774-.775,8.8-5.869a1,1,0,0,0,.445-.832V3.707a1,1,0,0,0-1-1H13.747a1,1,0,0,0-.832.445l-5.869,8.8-.774-.774A1,1,0,1,0,4.858,12.6l.93.93-4.2,4.2a1,1,0,0,0,0,1.414l3.272,3.272A1,1,0,0,0,6.272,22.414Zm8.01-17.707h5.011v5.01L10.6,15.511c-.1-.1-2.25-2.25-2.113-2.113ZM7.2,14.94,9.06,16.8l-3.495,3.5L3.707,18.435Z" />
  </svg>
);

const OroIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 10V14M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CopaIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.0002 16C6.24021 16 5.21983 10.2595 5.03907 5.70647C4.98879 4.43998 4.96365 3.80673 5.43937 3.22083C5.91508 2.63494 6.48445 2.53887 7.62318 2.34674C8.74724 2.15709 10.2166 2 12.0002 2C13.7837 2 15.2531 2.15709 16.3771 2.34674C17.5159 2.53887 18.0852 2.63494 18.5609 3.22083C19.0367 3.80673 19.0115 4.43998 18.9612 5.70647C18.7805 10.2595 17.7601 16 12.0002 16Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M19 5L19.9486 5.31621C20.9387 5.64623 21.4337 5.81124 21.7168 6.20408C22 6.59692 22 7.11873 21.9999 8.16234V8.23487C21.9999 9.09561 21.9999 9.52598 21.7927 9.87809C21.5855 10.2302 21.2093 10.4392 20.4569 10.8572L17.5 12.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 5L4.05132 5.31621C3.06126 5.64623 2.56623 5.81124 2.2831 6.20408C2 6.59692 2 7.11873 2 8.16234V8.23487C2.00003 9.09561 2.00004 9.52598 2.20723 9.87809C2.41441 10.2302 2.79063 10.4392 3.54305 10.8572L6.5 12.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 17V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M15.5 22H8.5L8.83922 20.3039C8.93271 19.8365 9.34312 19.5 9.8198 19.5H14.1802C14.6569 19.5 15.0673 19.8365 15.1608 20.3039L15.5 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 22H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BastoIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M328.5 32.86l-11.2 2.46-24.6 110.98-62.1-48.6c-1.5 2.4-2.6 4.6-3 6.8-.9 3.7-.5 7.6 2.3 13l58.2 47.6-12.9 93.5-2.4 2.2c-57.5 53.5-130.5 102.9-198.52 153 9.71 2.4 18.73 6.9 25.22 14.3 7 7.8 9.9 18.3 10.1 28.7C226.7 353.3 375.8 223.5 473 114.2c2.2-8.5.9-10.9-1.3-13.4-1.4-1.73-4.4-3.63-7.7-5.83C427.2 131.7 362.8 196.9 316.8 229.4l-16.9 12zM292.4 374.9c-25.4 6.8-50 9.3-74.5 10.1-6.9 6.1-13.7 12.2-20.5 18.3 17.2 0 34.6-.5 52.4-2.4 11.8 23 33.9 36.3 53 49.5l10.2-14.8c-17.4-12-33.9-22.6-43.8-37.3 9.1-1.5 18.4-3.5 27.8-6zm-234.53 55c-8.44.2-15.64 3-18.86 6.9-1.35 1.7-1.73 5 .1 10.3 1.83 5.4 5.79 11.6 9.31 15.4 4.78 5.2 12.43 11.1 19.57 14.2 7.13 3 12.6 3.2 16.09.9 3.67-2.4 6.98-9.2 7.44-17.2.46-8.1-2.11-16.5-5.48-20.3-4.41-5-14.5-9.4-24.48-10.1-1.25-.1-2.48-.1-3.68-.1z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// Patrón de naipes en SVG para el fondo del header
const CardPattern = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="cardPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none" />
        <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="rgba(255,255,255,0.06)" />
        <path d="M10 5 L15 10 L10 15 L5 10 Z" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cardPattern)" />
  </svg>
);

export default function Layout() {
  const { user, loading } = useAuthState();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pulperia-bg">
        <div className="flex flex-col items-center gap-3">
          <SpadaIcon size={32} className="text-pulperia-red animate-pulse" />
          <p className="text-pulperia-ink/50 font-serif italic text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pulperia-bg p-4">
        <div className="max-w-md w-full rounded-2xl overflow-hidden shadow-xl" style={{ border: '2px solid #D4AF37', position: 'relative' }}>

          {/* Borde interior dorado */}
          <div className="absolute inset-1 rounded-xl pointer-events-none z-0" style={{ border: '1px solid rgba(200,16,46,0.2)' }} />

          {/* Header con patrón de naipes */}
          <div className="relative bg-pulperia-red px-8 pt-8 pb-7 text-center overflow-hidden z-10">
            <CardPattern />

            {/* Iconos esquina izquierda */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-20 opacity-40">
              <SpadaIcon size={13} className="text-white" />
              <OroIcon size={13} className="text-white" />
              <CopaIcon size={13} className="text-white" />
              <BastoIcon size={13} className="text-white" />
            </div>

            {/* Iconos esquina derecha */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 z-20 opacity-40">
              <SpadaIcon size={13} className="text-white" />
              <OroIcon size={13} className="text-white" />
              <CopaIcon size={13} className="text-white" />
              <BastoIcon size={13} className="text-white" />
            </div>

            <div className="relative z-20">
              {/* 4 palos */}
              <div className="flex justify-center gap-3 mb-4">
                {[SpadaIcon, OroIcon, CopaIcon, BastoIcon].map((Icon, i) => (
                  <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Icon size={18} className="text-white" />
                  </div>
                ))}
              </div>

              {/* Badge */}
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 font-sans" style={{ background: 'rgba(212,175,55,0.9)', color: '#5a4400' }}>
                Pulpería Digital
              </span>

              <h1 className="text-4xl font-black text-white font-serif mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                Truco Tracker
              </h1>
              <p className="text-white/75 font-serif italic text-sm">
                Registrá tus partidas, seguí el tanteador y mirá quién manda en la mesa.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-8 py-6 relative z-10">

            {/* Preview del marcador */}
            <div className="rounded-xl p-4 mb-5 flex items-center justify-between" style={{ background: '#2C2A29' }}>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>Nosotros</p>
                <p className="text-3xl font-black font-serif" style={{ color: '#6ea8fe' }}>24</p>
                <div className="mt-1.5 h-1 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '80%', background: '#6ea8fe' }} />
                </div>
              </div>
              <p className="font-serif italic text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>vs</p>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>Ellos</p>
                <p className="text-3xl font-black font-serif" style={{ color: '#f87171' }}>17</p>
                <div className="mt-1.5 h-1 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: '57%', background: '#f87171' }} />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { Icon: SpadaIcon, color: '#C8102E', label: 'Estadísticas', desc: 'Ranking y rachas' },
                { Icon: OroIcon, color: '#D4AF37', label: 'En vivo', desc: 'Compartí el partido' },
                { Icon: CopaIcon, color: '#0033A0', label: 'Historial', desc: 'Todos tus partidos' },
                { Icon: BastoIcon, color: '#006400', label: 'Jugadores', desc: 'Némesis incluido' },
              ].map(({ Icon, color, label, desc }) => (
                <div key={label} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: '#F4F1EA', border: '1px solid #E5E0D8' }}>
                  <Icon size={20} className="" style={{ color }} />
                  <p className="text-xs font-bold uppercase tracking-wider text-pulperia-ink font-sans">{label}</p>
                  <p className="text-[11px] font-sans" style={{ color: '#888' }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* Botones */}
            <button
              onClick={signInWithGoogle}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 mb-2.5 transition-colors hover:bg-red-800 font-sans"
              style={{ background: '#C8102E' }}
            >
              <GoogleIcon />
              Entrar con Google
            </button>

            <button
              onClick={signInAsGuest}
              className="w-full py-3 rounded-xl font-bold transition-colors font-sans"
              style={{ background: 'transparent', border: '2px solid #C8102E', color: '#C8102E' }}
            >
              Continuar como invitado
            </button>

            <p className="text-center mt-3 font-serif italic text-xs" style={{ color: '#bbb' }}>
              Los datos de invitado no se sincronizan entre dispositivos
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: 'Partido', icon: SpadaIcon },
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
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
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
        <div className="p-6 text-center border-b border-pulperia-border/50 flex items-center justify-center gap-2">
          <SpadaIcon size={20} className="text-pulperia-red" />
          <h1 className="text-2xl font-bold text-pulperia-red font-serif">Truco Tracker</h1>
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
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || 'Invitado')}`}
                alt=""
                className="w-8 h-8 rounded-full border border-pulperia-gold bg-pulperia-bg"
              />
              <span className="text-sm font-bold text-pulperia-ink truncate">
                {user.isAnonymous ? 'Invitado' : user.displayName}
              </span>
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
