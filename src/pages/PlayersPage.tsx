import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useTrucoData, Player } from '../hooks/useTrucoData';
import { getSpanishCardAvatar } from '../utils/avatar';
import { Plus, User, Edit2, Mail, MessageCircle, X, Trophy, Flame, Skull, ChevronDown, Camera, Trash2 } from 'lucide-react';

const CLOUD_NAME = 'dhf6uuftb';
const UPLOAD_PRESET = 'ml_default';

// Abre el widget de Cloudinary y devuelve la URL resultante
function openCloudinaryWidget(): Promise<string | null> {
  return new Promise((resolve) => {
    const loadAndOpen = () => {
      const widget = (window as any).cloudinary.createUploadWidget(
        {
          cloudName: CLOUD_NAME,
          uploadPreset: UPLOAD_PRESET,
          sources: ['local', 'camera'],
          multiple: false,
          cropping: true,
          croppingAspectRatio: 1,
          showSkipCropButton: false,
          folder: 'truco-tracker/avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          styles: {
            palette: {
              window: '#FFFFFF',
              tabIcon: '#C8102E',
              link: '#C8102E',
              action: '#C8102E',
              sourceBg: '#F4F1EA',
            },
          },
        },
        (err: any, result: any) => {
          if (err) { resolve(null); return; }
          if (result?.event === 'success') {
            resolve(result.info.secure_url);
            widget.close();
          }
          if (result?.event === 'close') resolve(null);
        }
      );
      widget.open();
    };

    if ((window as any).cloudinary) {
      loadAndOpen();
    } else {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = loadAndOpen;
      document.head.appendChild(script);
    }
  });
}

const PlayerRow = ({ p, i, openProfileModal }: { key?: React.Key, p: any, i: number, openProfileModal: (p: any) => void }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col border-b border-pulperia-border last:border-0">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-pulperia-bg transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
           <div className="w-6 h-6 rounded-full bg-pulperia-gold/20 flex items-center justify-center text-pulperia-gold font-bold text-[10px] shrink-0 border border-pulperia-gold/30">{i + 1}</div>
           <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-8 h-8 rounded-full bg-pulperia-bg object-cover shrink-0 border border-pulperia-border" referrerPolicy="no-referrer" />
           <span className="font-bold text-pulperia-ink truncate max-w-[120px] sm:max-w-[200px]">{p.name}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
           <div className="text-center hidden sm:block"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">PJ</span><span className="font-medium text-pulperia-ink/80">{p.played}</span></div>
           <div className="text-center"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">G</span><span className="font-bold text-pulperia-green">{p.won}</span></div>
           <div className="text-center"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">P</span><span className="font-bold text-pulperia-red">{p.lost}</span></div>
           <ChevronDown size={16} className={`text-pulperia-ink/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {expanded && (
        <div className="bg-pulperia-bg p-4 flex flex-wrap gap-4 justify-between items-center border-t border-pulperia-border animate-in slide-in-from-top-2">
           <div className="flex gap-6 text-sm">
             <div className="text-center sm:hidden"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">PJ</span><span className="font-medium text-pulperia-ink/80">{p.played}</span></div>
             <div className="text-center"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">% Vic</span><span className="font-medium text-pulperia-ink">{p.winRate.toFixed(1)}%</span></div>
             <div className="text-center"><span className="block text-[10px] text-pulperia-ink/50 uppercase font-bold">Índice</span><span className="font-medium text-pulperia-ink">{p.index.toFixed(2)}</span></div>
           </div>
           <button onClick={(e) => { e.stopPropagation(); openProfileModal(p); }} className="px-4 py-2 bg-pulperia-ink text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm">
             <User size={14} /> Ver Perfil
           </button>
        </div>
      )}
    </div>
  );
};

export default function PlayersPage() {
  const { players, matches } = useTrucoData();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', photoUrl: '' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const nameToAdd = newPlayerName.trim();
    setNewPlayerName('');
    try {
      await addDoc(collection(db, 'players'), {
        name: nameToAdd,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'players');
      setNewPlayerName(nameToAdd);
    }
  };

  const openProfileModal = (playerStatsObj: any) => {
    setSelectedPlayer(playerStatsObj);
    setIsEditMode(false);
  };

  const openEditMode = () => {
    if (!selectedPlayer) return;
    setEditingPlayer(selectedPlayer);
    setEditForm({
      name: selectedPlayer.name,
      email: selectedPlayer.email || '',
      phone: selectedPlayer.phone || '',
      photoUrl: selectedPlayer.photoUrl || ''
    });
    setIsEditMode(true);
  };

  const deletePlayer = async () => {
    if (!selectedPlayer) return;
    try {
      await deleteDoc(doc(db, 'players', selectedPlayer.id));
      setSelectedPlayer(null);
      setConfirmingDelete(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${selectedPlayer.id}`);
    }
  };

  const handleUploadPlayerPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const url = await openCloudinaryWidget();
      if (url) {
        setEditForm(prev => ({ ...prev, photoUrl: url }));
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const savePlayer = async () => {
    if (!editingPlayer || !editForm.name.trim()) return;
    try {
      const playerRef = doc(db, 'players', editingPlayer.id);
      await updateDoc(playerRef, {
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        photoUrl: editForm.photoUrl.trim() || null,
      });
      setSelectedPlayer({
        ...selectedPlayer,
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        photoUrl: editForm.photoUrl.trim() || null,
      });
      setIsEditMode(false);
      setEditingPlayer(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `players/${editingPlayer.id}`);
    }
  };

  const handleInviteWA = (phone: string, name: string) => {
    const text = `¡Hola ${name}! Te invito a unirte a mis partidos de Truco en Truco Tracker.`;
    window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleInviteEmail = (email: string, name: string) => {
    const subject = `Invitación a Truco Tracker`;
    const body = `¡Hola ${name}!\n\nTe invito a unirte a mis partidos de Truco en Truco Tracker.`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const { playerStats, teamStats } = useMemo(() => {
    const pStats: Record<string, { 
      played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number;
      currentStreak: number; maxStreak: number;
      opponents: Record<string, { played: number; lostAgainst: number }>
    }> = {};
    const tStats: Record<string, { played: number; won: number; lost: number; playerNames: string[] }> = {};
    
    players.forEach(p => {
      pStats[p.id] = { 
        played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0,
        currentStreak: 0, maxStreak: 0, opponents: {}
      };
    });

    const sortedMatches = [...matches].filter(m => m.status === 'completed').sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
      return dateA - dateB;
    });

    sortedMatches.forEach(m => {
      const usWon = m.scoreUs > m.scoreThem;
      
      m.teamUs.forEach(pid => {
        if (!pStats[pid]) return;
        pStats[pid].played++;
        pStats[pid].pointsFor += m.scoreUs;
        pStats[pid].pointsAgainst += m.scoreThem;
        if (usWon) {
          pStats[pid].won++;
          pStats[pid].currentStreak++;
          pStats[pid].maxStreak = Math.max(pStats[pid].maxStreak, pStats[pid].currentStreak);
        } else {
          pStats[pid].lost++;
          pStats[pid].currentStreak = 0;
        }
        m.teamThem.forEach(oppId => {
          if (!pStats[pid].opponents[oppId]) pStats[pid].opponents[oppId] = { played: 0, lostAgainst: 0 };
          pStats[pid].opponents[oppId].played++;
          if (!usWon) pStats[pid].opponents[oppId].lostAgainst++;
        });
      });

      m.teamThem.forEach(pid => {
        if (!pStats[pid]) return;
        pStats[pid].played++;
        pStats[pid].pointsFor += m.scoreThem;
        pStats[pid].pointsAgainst += m.scoreUs;
        if (!usWon) {
          pStats[pid].won++;
          pStats[pid].currentStreak++;
          pStats[pid].maxStreak = Math.max(pStats[pid].maxStreak, pStats[pid].currentStreak);
        } else {
          pStats[pid].lost++;
          pStats[pid].currentStreak = 0;
        }
        m.teamUs.forEach(oppId => {
          if (!pStats[pid].opponents[oppId]) pStats[pid].opponents[oppId] = { played: 0, lostAgainst: 0 };
          pStats[pid].opponents[oppId].played++;
          if (usWon) pStats[pid].opponents[oppId].lostAgainst++;
        });
      });

      if (m.teamUs.length > 1) {
        const teamUsKey = [...m.teamUs].sort().join(',');
        if (!tStats[teamUsKey]) tStats[teamUsKey] = { played: 0, won: 0, lost: 0, playerNames: m.teamUs.map(id => players.find(p => p.id === id)?.name || 'Desconocido') };
        tStats[teamUsKey].played++;
        if (usWon) tStats[teamUsKey].won++; else tStats[teamUsKey].lost++;
      }

      if (m.teamThem.length > 1) {
        const teamThemKey = [...m.teamThem].sort().join(',');
        if (!tStats[teamThemKey]) tStats[teamThemKey] = { played: 0, won: 0, lost: 0, playerNames: m.teamThem.map(id => players.find(p => p.id === id)?.name || 'Desconocido') };
        tStats[teamThemKey].played++;
        if (!usWon) tStats[teamThemKey].won++; else tStats[teamThemKey].lost++;
      }
    });

    const processedPlayerStats = players.map(p => {
      const stats = pStats[p.id];
      let nemesisId = null;
      let highestLossRate = -1;
      Object.entries(stats.opponents).forEach(([oppId, oppStats]) => {
        if (oppStats.played >= 2) {
          const lossRate = oppStats.lostAgainst / oppStats.played;
          if (lossRate > highestLossRate) {
            highestLossRate = lossRate;
            nemesisId = oppId;
          }
        }
      });
      const nemesisName = nemesisId ? players.find(pl => pl.id === nemesisId)?.name : null;
      return {
        ...p,
        ...stats,
        nemesisName,
        winRate: stats.played > 0 ? (stats.won / stats.played) * 100 : 0,
        index: stats.played > 0 ? ((stats.won * 3) + (stats.pointsFor - stats.pointsAgainst)) / stats.played : 0
      };
    }).sort((a, b) => b.index - a.index);

    const processedTeamStats = Object.values(tStats).map(t => ({
      ...t,
      winRate: t.played > 0 ? (t.won / t.played) * 100 : 0
    })).filter(t => t.played >= 2).sort((a, b) => b.winRate - a.winRate);

    return { playerStats: processedPlayerStats, teamStats: processedTeamStats };
  }, [players, matches]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-pulperia-red font-serif">Jugadores y Equipos</h1>
          <p className="text-pulperia-ink/70 text-sm mt-1 font-serif italic">Gestiona jugadores y revisa sus estadísticas individuales y por equipo.</p>
        </div>
      </header>

      <div className="card-espanola p-5">
        <form onSubmit={addPlayer} className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Nombre del nuevo jugador"
            className="flex-1 px-4 py-2.5 bg-pulperia-bg border border-pulperia-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pulperia-red transition-all font-medium text-sm"
          />
          <button
            type="submit"
            disabled={!newPlayerName.trim()}
            className="px-5 py-2.5 bg-pulperia-red text-white rounded-lg font-bold hover:bg-red-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto shadow-sm"
          >
            <Plus size={18} /> Añadir
          </button>
        </form>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-pulperia-ink font-serif">Ranking Individual</h2>
          <div className="card-espanola overflow-hidden">
            <div className="divide-y divide-pulperia-border">
              {playerStats.map((p, i) => (
                <PlayerRow key={p.id} p={p} i={i} openProfileModal={openProfileModal} />
              ))}
              {playerStats.length === 0 && (
                <div className="p-8 text-center text-pulperia-ink/50 text-sm italic font-serif">
                  No hay jugadores registrados.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-pulperia-ink font-serif">Mejores Equipos</h2>
          <div className="card-espanola overflow-hidden">
            <div className="p-4 space-y-3">
              {teamStats.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-pulperia-bg rounded-xl border border-pulperia-border">
                  <div>
                    <p className="font-bold text-pulperia-ink text-sm">{t.playerNames.join(' + ')}</p>
                    <p className="text-xs text-pulperia-ink/60">{t.played} partidos ({t.won}G - {t.lost}P)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-pulperia-blue">{t.winRate.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
              {teamStats.length === 0 && (
                <p className="text-center text-pulperia-ink/40 text-sm py-4 italic font-serif">No hay suficientes datos de equipos (mínimo 2 partidos).</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de perfil y edición */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="card-espanola max-w-md w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-pulperia-red p-6 text-white relative fileteado-border">
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              {!isEditMode ? (
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedPlayer.photoUrl || getSpanishCardAvatar(selectedPlayer.name)} 
                    alt={selectedPlayer.name} 
                    className="w-20 h-20 rounded-full bg-pulperia-bg border-2 border-pulperia-gold object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-3xl font-bold font-serif">{selectedPlayer.name}</h3>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={openEditMode}
                        className="flex items-center gap-1 text-xs font-bold bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <Edit2 size={12} /> Editar Perfil
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(true)}
                        className="flex items-center gap-1 text-xs font-bold bg-black/20 hover:bg-red-900/60 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-bold mb-1 font-serif">Editar Jugador</h3>
                  <p className="text-white/70 text-sm italic font-serif">Modifica los datos de contacto y foto.</p>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto bg-pulperia-bg">
              {!isEditMode ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-pulperia-card p-3 rounded-xl text-center border border-pulperia-border shadow-sm">
                      <p className="text-xs font-bold text-pulperia-ink/60 uppercase">Partidos</p>
                      <p className="text-2xl font-black text-pulperia-ink">{selectedPlayer.played}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl text-center border border-green-200 shadow-sm">
                      <p className="text-xs font-bold text-pulperia-green uppercase">Victorias</p>
                      <p className="text-2xl font-black text-green-800">{selectedPlayer.won}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-200 shadow-sm">
                      <p className="text-xs font-bold text-pulperia-blue uppercase">% Win</p>
                      <p className="text-2xl font-black text-blue-800">{selectedPlayer.winRate.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-pulperia-ink flex items-center gap-2 font-serif text-lg">
                      <Trophy size={18} className="text-pulperia-gold" /> Destacados
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 flex items-start gap-3 shadow-sm">
                        <Flame className="text-orange-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs font-bold text-orange-800 uppercase">Racha Actual</p>
                          <p className="text-xl font-black text-orange-700">{selectedPlayer.currentStreak} <span className="text-xs font-medium">ganados</span></p>
                          <p className="text-[10px] text-orange-600 mt-1 font-bold">Récord: {selectedPlayer.maxStreak}</p>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex items-start gap-3 shadow-sm">
                        <Skull className="text-purple-600 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs font-bold text-purple-800 uppercase">Su Némesis</p>
                          <p className="text-sm font-bold text-purple-900 mt-1 leading-tight">
                            {selectedPlayer.nemesisName || 'Ninguno aún'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-pulperia-border">
                    <h4 className="text-xs font-bold text-pulperia-ink/60 uppercase mb-3">Invitar a jugar</h4>
                    {(selectedPlayer.phone || selectedPlayer.email) ? (
                      <div className="flex gap-2">
                        {selectedPlayer.phone && (
                          <button
                            onClick={() => handleInviteWA(selectedPlayer.phone, selectedPlayer.name)}
                            className="flex-1 py-2.5 bg-green-100 text-green-800 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <MessageCircle size={16} /> WhatsApp
                          </button>
                        )}
                        {selectedPlayer.email && (
                          <button
                            onClick={() => handleInviteEmail(selectedPlayer.email, selectedPlayer.name)}
                            className="flex-1 py-2.5 bg-blue-100 text-blue-800 rounded-lg font-bold text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Mail size={16} /> Email
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center bg-pulperia-card p-4 rounded-xl border border-pulperia-border">
                        <p className="text-sm text-pulperia-ink/60 mb-3 italic font-serif">Añade un email o teléfono para invitar a este jugador.</p>
                        <button
                          onClick={() => setIsEditMode(true)}
                          className="px-4 py-2 bg-pulperia-ink/10 text-pulperia-ink rounded-lg font-bold text-xs hover:bg-pulperia-ink/20 transition-colors"
                        >
                          Añadir Contacto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* Foto del jugador */}
                  <div>
                    <label className="block text-xs font-bold text-pulperia-ink/60 uppercase tracking-wider mb-2">Foto</label>
                    <div className="flex items-center gap-4">
                      <img
                        src={editForm.photoUrl || getSpanishCardAvatar(editForm.name)}
                        alt={editForm.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-pulperia-border bg-pulperia-bg"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={handleUploadPlayerPhoto}
                        disabled={uploadingPhoto}
                        className="flex items-center gap-2 px-4 py-2 bg-pulperia-ink/10 text-pulperia-ink rounded-lg font-bold text-sm hover:bg-pulperia-ink/20 transition-colors disabled:opacity-50"
                      >
                        {uploadingPhoto
                          ? <div className="w-4 h-4 border-2 border-pulperia-ink border-t-transparent rounded-full animate-spin" />
                          : <Camera size={16} />
                        }
                        {uploadingPhoto ? 'Subiendo...' : 'Subir foto'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-pulperia-ink/60 uppercase tracking-wider mb-1">Nombre</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-pulperia-card border border-pulperia-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pulperia-red font-medium text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-pulperia-ink/60 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-4 py-2.5 bg-pulperia-card border border-pulperia-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pulperia-red font-medium text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-pulperia-ink/60 uppercase tracking-wider mb-1">WhatsApp (Teléfono)</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+5491123456789"
                      className="w-full px-4 py-2.5 bg-pulperia-card border border-pulperia-border rounded-lg focus:outline-none focus:ring-2 focus:ring-pulperia-red font-medium text-sm"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 py-3 bg-pulperia-ink/10 text-pulperia-ink rounded-lg font-bold text-sm hover:bg-pulperia-ink/20 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={savePlayer}
                      disabled={!editForm.name.trim()}
                      className="flex-1 py-3 bg-pulperia-red text-white rounded-lg font-bold text-sm hover:bg-red-800 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar jugador */}
      {confirmingDelete && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="card-espanola p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-pulperia-red">
              <Trash2 size={22} />
              <h3 className="text-xl font-bold font-serif">Eliminar jugador</h3>
            </div>
            <p className="text-pulperia-ink/70 text-sm mb-6 italic font-serif">
              ¿Estás seguro de que querés eliminar a <strong>{selectedPlayer.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-2.5 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-lg font-bold text-sm hover:bg-pulperia-gold/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deletePlayer}
                className="flex-1 py-2.5 bg-pulperia-red text-white rounded-lg font-bold text-sm hover:bg-red-800 transition-colors shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}