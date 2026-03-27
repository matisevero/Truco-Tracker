import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuthState } from '../hooks/useAuthState';
import { logOut, linkWithGoogle, auth } from '../firebase';
import { useTheme } from '../hooks/useTheme';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { LogOut, Bell, Palette, Link as LinkIcon, Camera, Pencil, Check, X } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthState();
  const { minimal, toggle } = useTheme();
  const { uploadPhoto, uploading } = usePhotoUpload();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim() || !auth.currentUser) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      await auth.currentUser.reload();
      setEditingName(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingName(false);
    }
  };

  const avatarSrc = user?.photoURL
    || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || 'Invitado')}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-serif">Configuración</h1>
        <p className="text-zinc-500 text-sm mt-1 font-serif italic">Gestiona tu perfil y preferencias de la aplicación.</p>
      </header>

      <div className="card-espanola overflow-hidden">

        {/* Perfil */}
        <div className="p-6 border-b border-pulperia-border flex items-center gap-4">

          {/* Avatar con botón de cámara */}
          <div className="relative shrink-0">
            <img
              src={avatarSrc}
              alt={user?.displayName || 'Invitado'}
              className="w-20 h-20 rounded-full bg-pulperia-bg object-cover border-2 border-pulperia-gold"
              referrerPolicy="no-referrer"
            />
            {!user?.isAnonymous && (
              <button
                onClick={uploadPhoto}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-pulperia-red text-white rounded-full flex items-center justify-center border-2 border-white shadow-md hover:bg-red-800 transition-colors disabled:opacity-60"
                title="Cambiar foto"
              >
                {uploading
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={13} />
                }
              </button>
            )}
          </div>

          {/* Nombre editable */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 min-w-0 px-3 py-1.5 bg-pulperia-bg border border-pulperia-border rounded-lg text-pulperia-ink font-bold text-base focus:outline-none focus:ring-2 focus:ring-pulperia-red font-serif"
                  maxLength={30}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="w-8 h-8 bg-pulperia-red text-white rounded-full flex items-center justify-center hover:bg-red-800 transition-colors shrink-0"
                >
                  {savingName
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={14} />
                  }
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewName(user?.displayName || ''); }}
                  className="w-8 h-8 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-full flex items-center justify-center hover:bg-pulperia-border transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-pulperia-ink font-serif truncate">
                    {user?.isAnonymous ? 'Invitado' : user?.displayName}
                  </h2>
                  <p className="text-pulperia-ink/60 text-sm truncate">
                    {user?.isAnonymous ? 'Cuenta temporal' : user?.email}
                  </p>
                </div>
                {!user?.isAnonymous && (
                  <button
                    onClick={() => { setEditingName(true); setNewName(user?.displayName || ''); }}
                    className="shrink-0 w-7 h-7 bg-pulperia-bg border border-pulperia-border text-pulperia-ink/50 rounded-full flex items-center justify-center hover:text-pulperia-ink hover:bg-pulperia-border transition-colors"
                    title="Editar nombre"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-2">

          {/* Vincular Google solo para invitados */}
          {user?.isAnonymous && (
            <div
              onClick={linkWithGoogle}
              className="p-4 flex items-center justify-between hover:bg-pulperia-bg rounded-xl transition-colors cursor-pointer border border-pulperia-red/20 bg-pulperia-red/5 mb-2"
            >
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

          {/* Notificaciones */}
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
