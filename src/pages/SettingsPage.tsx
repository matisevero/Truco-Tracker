import { useAuthState } from '../hooks/useAuthState';
import { logOut, linkWithGoogle } from '../firebase';
import { useTheme } from '../hooks/useTheme';
import { LogOut, User, Bell, Palette, Link as LinkIcon, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthState();
  const { minimal, toggle } = useTheme();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-serif">Configuración</h1>
        <p className="text-zinc-500 text-sm mt-1 font-serif italic">Gestiona tu perfil y preferencias de la aplicación.</p>
      </header>

      <div className="card-espanola overflow-hidden">
        <div className="p-6 border-b border-pulperia-border flex items-center gap-4">
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || 'Invitado')}`} 
            alt={user?.displayName || 'Invitado'} 
            className="w-16 h-16 rounded-full bg-pulperia-bg object-cover border-2 border-pulperia-gold"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl font-bold text-pulperia-ink font-serif">{user?.isAnonymous ? 'Invitado' : user?.displayName}</h2>
            <p className="text-pulperia-ink/60 text-sm">{user?.isAnonymous ? 'Cuenta temporal' : user?.email}</p>
          </div>
        </div>

        <div className="p-2">
          {user?.isAnonymous && (
            <div onClick={linkWithGoogle} className="p-4 flex items-center justify-between hover:bg-pulperia-bg rounded-xl transition-colors cursor-pointer border border-pulperia-red/20 bg-pulperia-red/5 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pulperia-red/10 flex items-center justify-center text-pulperia-red">
                  <LinkIcon size={20} />
                </div>
                <div>
                  <p className="font-bold text-pulperia-red">Vincular cuenta de Google</p>
                  <p className="text-xs text-pulperia-ink/60">Guarda tu progreso permanentemente</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 flex items-center justify-between hover:bg-pulperia-bg rounded-xl transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pulperia-blue/10 flex items-center justify-center text-pulperia-blue">
                <User size={20} />
              </div>
              <div>
                <p className="font-bold text-pulperia-ink">Editar Perfil</p>
                <p className="text-xs text-pulperia-ink/60">Actualiza tu nombre y foto</p>
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-pulperia-bg rounded-xl transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Bell size={20} />
              </div>
              <div>
                <p className="font-medium text-pulperia-ink">Notificaciones</p>
                <p className="text-xs text-pulperia-ink/60">Configura alertas de partidos</p>
              </div>
            </div>
          </div>

          {/* Modo Minimalista */}
          <div
            onClick={toggle}
            className="p-4 flex items-center justify-between hover:bg-pulperia-bg rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Palette size={20} />
              </div>
              <div>
                <p className="font-medium text-pulperia-ink">Modo Minimalista</p>
                <p className="text-xs text-pulperia-ink/60">
                  {minimal ? 'Diseño limpio activo' : 'Activar diseño limpio y moderno'}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <div className={`w-11 h-6 rounded-full flex items-center transition-colors px-0.5 ${minimal ? 'bg-pulperia-blue' : 'bg-pulperia-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${minimal ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-pulperia-border">
          <button 
            onClick={logOut}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
