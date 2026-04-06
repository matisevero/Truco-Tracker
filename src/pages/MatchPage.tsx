import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, signInWithGoogle } from '../firebase';
import { useTrucoData, Match, Player, PointEvent } from '../hooks/useTrucoData';
import { getSpanishCardAvatar } from '../utils/avatar';
import { Plus, Minus, Check, Users, Trophy, RotateCcw, Shuffle, Share2, X, Sparkles, AlertCircle, LogOut, Flag, Search, Menu, Maximize, Minimize } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MatchPage() {
  const { players, matches } = useTrucoData();
  const [teamUsSelection, setTeamUsSelection] = useState<string[]>([]);
  const [teamThemSelection, setTeamThemSelection] = useState<string[]>([]);

  const [searchUs, setSearchUs] = useState('');
  const [searchThem, setSearchThem] = useState('');
  const [dropdownUs, setDropdownUs] = useState(false);
  const [dropdownThem, setDropdownThem] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingAbandon, setIsConfirmingAbandon] = useState(false);
  const [isConfirmingMazo, setIsConfirmingMazo] = useState(false);
  const [isShuffleModalOpen, setIsShuffleModalOpen] = useState(false);
  const [shuffleSelectedPlayers, setShuffleSelectedPlayers] = useState<string[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);

  // Acumulador de toques: muestra cuántos puntos se van a sumar antes de confirmar
  const [tapAccumUs, setTapAccumUs] = useState(0);
  const [tapAccumThem, setTapAccumThem] = useState(0);
  const tapTimerUs = useRef<any>(null);
  const tapTimerThem = useRef<any>(null);
  const TAP_DELAY = 800; // ms de pausa antes de confirmar
  
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const [showGuestWarning, setShowGuestWarning] = useState(() => {
    // Only show once per session if they are anonymous
    const hasSeenWarning = sessionStorage.getItem('guestWarningSeen');
    return auth.currentUser?.isAnonymous && !hasSeenWarning;
  });

  const dismissGuestWarning = () => {
    sessionStorage.setItem('guestWarningSeen', 'true');
    setShowGuestWarning(false);
  };
  
  const historyEndRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  // Find if there's an in-progress match
  const currentMatch = matches.find(m => m.status === 'in-progress');
  // Solo el creador del partido puede sumar puntos o finalizarlo
  const isOwner = currentMatch?.createdBy === auth.currentUser?.uid;

  // Wake Lock API to keep screen awake during match
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    };

    if (currentMatch) {
      requestWakeLock();
    }

    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible' && currentMatch) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentMatch]);

  // Scroll automático eliminado — era molesto durante el juego

  // Toca el número grande → acumula y después de TAP_DELAY ms confirma
  const tapScore = (team: 'Us' | 'Them') => {
    if (!isOwner) return; // solo el dueño puede tocar (se evalúa más abajo pero por seguridad)
    if (team === 'Us') {
      setTapAccumUs(prev => prev + 1);
      if (tapTimerUs.current) clearTimeout(tapTimerUs.current);
      tapTimerUs.current = setTimeout(() => {
        setTapAccumUs(prev => {
          if (prev > 0) updateScore('Us', prev, prev === 1 ? 'Punto' : `${prev} Puntos`);
          return 0;
        });
      }, TAP_DELAY);
    } else {
      setTapAccumThem(prev => prev + 1);
      if (tapTimerThem.current) clearTimeout(tapTimerThem.current);
      tapTimerThem.current = setTimeout(() => {
        setTapAccumThem(prev => {
          if (prev > 0) updateScore('Them', prev, prev === 1 ? 'Punto' : `${prev} Puntos`);
          return 0;
        });
      }, TAP_DELAY);
    }
  };

  const startMatch = async () => {
    if (teamUsSelection.length === 0 || teamThemSelection.length === 0) {
      alert("Selecciona al menos un jugador por equipo.");
      return;
    }
    try {
      await addDoc(collection(db, 'matches'), {
        date: serverTimestamp(),
        teamUs: teamUsSelection,
        teamThem: teamThemSelection,
        // Nombres denormalizados para la vista pública sin auth
        teamUsNames: teamUsSelection.map(id => players.find(p => p.id === id)?.name || 'Jugador'),
        teamThemNames: teamThemSelection.map(id => players.find(p => p.id === id)?.name || 'Jugador'),
        scoreUs: 0,
        scoreThem: 0,
        status: 'in-progress',
        createdBy: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const updateScore = async (team: 'Us' | 'Them', change: number, reason: string = 'Puntos') => {
    if (!currentMatch) return;
    const newScore = team === 'Us'
      ? Math.max(0, Math.min(30, currentMatch.scoreUs + change))
      : Math.max(0, Math.min(30, currentMatch.scoreThem + change));

    let newHistory = [...(currentMatch.pointHistory || [])];

    if (change > 0) {
      // Suma: agregar nuevo evento al historial
      const newEvent: PointEvent = {
        id: Math.random().toString(36).substring(7),
        team,
        points: change,
        reason,
        timestamp: Date.now()
      };
      newHistory = [...newHistory, newEvent];
    } else if (change === -1) {
      // Resta manual (-1): modificar el ultimo evento de ese equipo en el historial
      const teamEvents = newHistory
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.team === team);
      const lastIdx = teamEvents[teamEvents.length - 1];

      if (lastIdx !== undefined) {
        if (lastIdx.e.points > 1) {
          // Reducir en 1 y marcar como generico
          newHistory[lastIdx.i] = {
            ...lastIdx.e,
            points: lastIdx.e.points - 1,
            reason: 'Punto',
          };
        } else {
          // Era 1 punto, eliminar la entrada entera
          newHistory.splice(lastIdx.i, 1);
        }
      }
    }

    try {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        [`score${team}`]: newScore,
        pointHistory: newHistory
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${currentMatch.id}`);
    }
  };

  const undoLastPoint = async () => {
    if (!currentMatch || !currentMatch.pointHistory || currentMatch.pointHistory.length === 0) return;
    
    const history = [...currentMatch.pointHistory];
    const lastEvent = history.pop();
    if (!lastEvent) return;

    const team = lastEvent.team;
    const newScore = team === 'Us' 
      ? Math.max(0, currentMatch.scoreUs - lastEvent.points)
      : Math.max(0, currentMatch.scoreThem - lastEvent.points);

    try {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        [`score${team}`]: newScore,
        pointHistory: history
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${currentMatch.id}`);
    }
  };

  const finishMatch = async () => {
    if (!currentMatch) return;
    try {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        status: 'completed'
      });
      setTeamUsSelection([]);
      setTeamThemSelection([]);
      setIsConfirming(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${currentMatch.id}`);
    }
  };

  // Abandonar: finaliza el partido con los puntajes actuales (rendirse)
  const abandonMatch = async () => {
    if (!currentMatch) return;
    try {
      await updateDoc(doc(db, 'matches', currentMatch.id), {
        status: 'completed'
      });
      setTeamUsSelection([]);
      setTeamThemSelection([]);
      setIsConfirmingAbandon(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${currentMatch.id}`);
    }
  };

  // Irse al mazo: elimina el partido sin guardar (como si nunca hubiera existido)
  const irseAlMazo = async () => {
    if (!currentMatch) return;
    try {
      await deleteDoc(doc(db, 'matches', currentMatch.id));
      setTeamUsSelection([]);
      setTeamThemSelection([]);
      setIsConfirmingMazo(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${currentMatch.id}`);
    }
  };


  const togglePlayer = (team: 'Us' | 'Them', playerId: string) => {
    if (team === 'Us') {
      setTeamUsSelection(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
      setTeamThemSelection(prev => prev.filter(id => id !== playerId));
    } else {
      setTeamThemSelection(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
      setTeamUsSelection(prev => prev.filter(id => id !== playerId));
    }
  };

  const openShuffleModal = () => {
    // Pre-select players already in teams, up to 6
    const preSelected = [...teamUsSelection, ...teamThemSelection].slice(0, 6);
    setShuffleSelectedPlayers(preSelected);
    setIsShuffleModalOpen(true);
  };

  const toggleShufflePlayer = (playerId: string) => {
    setShuffleSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= 6) {
        alert("Máximo 6 jugadores (3 vs 3).");
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const executeShuffle = () => {
    if (shuffleSelectedPlayers.length < 2) {
      alert("Se necesitan al menos 2 jugadores para sortear.");
      return;
    }
    
    setIsShuffling(true);
    
    // Simulate animation delay
    setTimeout(() => {
      const shuffled = [...shuffleSelectedPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const half = Math.floor(shuffled.length / 2);
      
      setTeamUsSelection(shuffled.slice(0, half));
      setTeamThemSelection(shuffled.slice(half));
      
      setIsShuffling(false);
      setIsShuffleModalOpen(false);
    }, 1500);
  };

  const shareMatch = async () => {
    if (!currentMatch) return;

    const usNames = currentMatch.teamUsNames?.join(' & ')
      || currentMatch.teamUs.map(id => players.find(p => p.id === id)?.name || 'Jugador').join(' & ');
    const themNames = currentMatch.teamThemNames?.join(' & ')
      || currentMatch.teamThem.map(id => players.find(p => p.id === id)?.name || 'Jugador').join(' & ');

    const liveUrl = `${window.location.origin}/match/${currentMatch.id}`;
    // La URL va dentro del texto para que siempre aparezca en WhatsApp y otras apps
    const shareText = `🃏 Seguí el truco en vivo!\n${usNames} vs ${themNames}\n${liveUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Truco en vivo',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('¡Link copiado! Pegalo donde quieras.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  if (!currentMatch) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-pulperia-red font-serif">Nuevo Partido</h1>
          <p className="text-pulperia-ink/70 text-sm mt-1 font-serif italic">Selecciona los equipos para comenzar.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Equipo Nosotros */}
          <div className="card-espanola p-5">
            <h2 className="text-xl font-bold text-pulperia-ink mb-3 flex items-center gap-2 font-serif">
              <Users className="text-pulperia-blue" size={20} /> Nosotros
            </h2>

            {/* Chips de seleccionados */}
            {teamUsSelection.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {teamUsSelection.map(id => {
                  const p = players.find(p => p.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-pulperia-blue text-white rounded-full text-xs font-bold shadow-sm">
                      <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-4 h-4 rounded-full object-cover bg-white/20" alt="" />
                      {p.name}
                      <button onClick={() => togglePlayer('Us', id)} className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Input de búsqueda */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-pulperia-bg border border-pulperia-border rounded-xl focus-within:border-pulperia-blue transition-colors">
                <Search size={14} className="text-pulperia-ink/40 shrink-0" />
                <input
                  type="text"
                  value={searchUs}
                  onChange={e => { setSearchUs(e.target.value); setDropdownUs(true); }}
                  onFocus={() => setDropdownUs(true)}
                  onBlur={() => setTimeout(() => setDropdownUs(false), 150)}
                  placeholder="Buscar jugador..."
                  className="flex-1 bg-transparent text-sm text-pulperia-ink placeholder:text-pulperia-ink/30 outline-none font-serif"
                />
              </div>

              {dropdownUs && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-pulperia-card border border-pulperia-border rounded-xl shadow-lg overflow-hidden">
                  {players
                    .filter(p =>
                      !teamUsSelection.includes(p.id) &&
                      !teamThemSelection.includes(p.id) &&
                      p.name.toLowerCase().includes(searchUs.toLowerCase())
                    )
                    .slice(0, 6)
                    .map(p => (
                      <button
                        key={p.id}
                        onMouseDown={() => { togglePlayer('Us', p.id); setSearchUs(''); setDropdownUs(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-pulperia-bg transition-colors text-left"
                      >
                        <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-7 h-7 rounded-full object-cover border border-pulperia-border" alt="" />
                        <span className="text-sm font-bold text-pulperia-ink font-serif">{p.name}</span>
                      </button>
                    ))
                  }
                  {players.filter(p =>
                    !teamUsSelection.includes(p.id) &&
                    !teamThemSelection.includes(p.id) &&
                    p.name.toLowerCase().includes(searchUs.toLowerCase())
                  ).length === 0 && (
                    <p className="text-xs text-pulperia-ink/40 text-center py-3 italic font-serif">
                      {searchUs ? 'Sin resultados' : 'Todos los jugadores ya fueron asignados'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {players.length === 0 && (
              <p className="text-sm text-pulperia-ink/40 font-serif italic mt-2">No hay jugadores. Añade en la pestaña Jugadores.</p>
            )}
          </div>

          {/* Equipo Ellos */}
          <div className="card-espanola p-5">
            <h2 className="text-xl font-bold text-pulperia-ink mb-3 flex items-center gap-2 font-serif">
              <Users className="text-pulperia-red" size={20} /> Ellos
            </h2>

            {/* Chips de seleccionados */}
            {teamThemSelection.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {teamThemSelection.map(id => {
                  const p = players.find(p => p.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-pulperia-red text-white rounded-full text-xs font-bold shadow-sm">
                      <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-4 h-4 rounded-full object-cover bg-white/20" alt="" />
                      {p.name}
                      <button onClick={() => togglePlayer('Them', id)} className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Input de búsqueda */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-pulperia-bg border border-pulperia-border rounded-xl focus-within:border-pulperia-red transition-colors">
                <Search size={14} className="text-pulperia-ink/40 shrink-0" />
                <input
                  type="text"
                  value={searchThem}
                  onChange={e => { setSearchThem(e.target.value); setDropdownThem(true); }}
                  onFocus={() => setDropdownThem(true)}
                  onBlur={() => setTimeout(() => setDropdownThem(false), 150)}
                  placeholder="Buscar jugador..."
                  className="flex-1 bg-transparent text-sm text-pulperia-ink placeholder:text-pulperia-ink/30 outline-none font-serif"
                />
              </div>

              {dropdownThem && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-pulperia-card border border-pulperia-border rounded-xl shadow-lg overflow-hidden">
                  {players
                    .filter(p =>
                      !teamThemSelection.includes(p.id) &&
                      !teamUsSelection.includes(p.id) &&
                      p.name.toLowerCase().includes(searchThem.toLowerCase())
                    )
                    .slice(0, 6)
                    .map(p => (
                      <button
                        key={p.id}
                        onMouseDown={() => { togglePlayer('Them', p.id); setSearchThem(''); setDropdownThem(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-pulperia-bg transition-colors text-left"
                      >
                        <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-7 h-7 rounded-full object-cover border border-pulperia-border" alt="" />
                        <span className="text-sm font-bold text-pulperia-ink font-serif">{p.name}</span>
                      </button>
                    ))
                  }
                  {players.filter(p =>
                    !teamThemSelection.includes(p.id) &&
                    !teamUsSelection.includes(p.id) &&
                    p.name.toLowerCase().includes(searchThem.toLowerCase())
                  ).length === 0 && (
                    <p className="text-xs text-pulperia-ink/40 text-center py-3 italic font-serif">
                      {searchThem ? 'Sin resultados' : 'Todos los jugadores ya fueron asignados'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={openShuffleModal}
            className="flex-1 py-3 bg-pulperia-card border border-pulperia-border text-pulperia-ink rounded-xl font-bold text-base hover:bg-pulperia-bg transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Shuffle size={18} /> Sortear Equipos
          </button>
          <button
            onClick={startMatch}
            disabled={teamUsSelection.length === 0 || teamThemSelection.length === 0}
            className="flex-1 py-3 bg-pulperia-red text-white rounded-xl font-bold text-base hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Comenzar Partido
          </button>
        </div>

        {/* Shuffle Modal */}
        {isShuffleModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="card-espanola p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-pulperia-ink flex items-center gap-2 font-serif">
                  <Sparkles className="text-pulperia-gold" size={24} /> Tirada de Reyes
                </h3>
                {!isShuffling && (
                  <button onClick={() => setIsShuffleModalOpen(false)} className="text-pulperia-ink/40 hover:text-pulperia-ink transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <p className="text-pulperia-ink/60 text-sm mb-4 italic font-serif">
                Selecciona los jugadores presentes (Máximo 6).
              </p>

              <div className="max-h-60 overflow-y-auto mb-6 pr-2 space-y-2">
                {players.map(p => (
                  <button
                    key={p.id}
                    disabled={isShuffling}
                    onClick={() => toggleShufflePlayer(p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      shuffleSelectedPlayers.includes(p.id)
                        ? 'border-pulperia-gold bg-pulperia-gold/10 text-pulperia-ink font-bold'
                        : 'border-pulperia-border bg-pulperia-bg text-pulperia-ink/70 hover:border-pulperia-gold/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-8 h-8 rounded-full object-cover bg-white border border-pulperia-border" alt="" />
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      shuffleSelectedPlayers.includes(p.id) ? 'bg-pulperia-gold border-pulperia-gold' : 'border-pulperia-border'
                    }`}>
                      {shuffleSelectedPlayers.includes(p.id) && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
                {players.length === 0 && <p className="text-sm text-pulperia-ink/40 text-center py-4 italic font-serif">No hay jugadores registrados.</p>}
              </div>

              <div className="flex justify-between items-center text-xs font-bold text-pulperia-ink/50 uppercase tracking-wider mb-4">
                <span>Seleccionados: {shuffleSelectedPlayers.length}/6</span>
              </div>

              <button
                onClick={executeShuffle}
                disabled={shuffleSelectedPlayers.length < 2 || isShuffling}
                className="w-full py-3 bg-pulperia-ink text-white rounded-xl font-bold text-base hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 relative overflow-hidden"
              >
                {isShuffling ? (
                  <>
                    <Shuffle size={18} className="animate-spin" /> Mezclando cartas...
                  </>
                ) : (
                  <>
                    <Shuffle size={18} /> Tirar Reyes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isPicaPica = (currentMatch.teamUs.length + currentMatch.teamThem.length === 6) &&
                     (currentMatch.scoreUs >= 5 && currentMatch.scoreUs < 15 && currentMatch.scoreThem >= 5 && currentMatch.scoreThem < 15);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-pulperia-red font-serif">Partido en Curso</h1>
          <p className="text-pulperia-ink/70 text-sm mt-1 font-serif italic">
            {isOwner ? 'El primero en llegar a 30 gana.' : 'Estás viendo este partido en vivo.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => setIsConfirmingMazo(true)}
                className="px-3 py-1.5 bg-pulperia-bg border border-pulperia-border text-pulperia-ink/70 rounded-xl text-xs font-bold hover:bg-pulperia-gold/20 transition-colors shadow-sm flex items-center gap-1.5"
                title="Irse al mazo (cancelar partido)"
              >
                <X size={14} /> Al mazo
              </button>
              <button
                onClick={() => setIsConfirmingAbandon(true)}
                className="px-3 py-1.5 bg-pulperia-red/10 border border-pulperia-red/20 text-pulperia-red rounded-xl text-xs font-bold hover:bg-pulperia-red/20 transition-colors shadow-sm flex items-center gap-1.5"
                title="Abandonar (terminar y guardar)"
              >
                <Flag size={14} /> Abandonar
              </button>
            </>
          )}
          <button
            onClick={shareMatch}
            className="p-2 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-full hover:bg-pulperia-gold/20 transition-colors shadow-sm"
            title="Compartir Partido en Vivo"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-full hover:bg-pulperia-gold/20 transition-colors shadow-sm"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </header>


      {isPicaPica && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-xl text-center font-bold text-sm uppercase tracking-widest animate-pulse shadow-sm fileteado-border">
          ¡Pica Pica!
        </div>
      )}

      <div className="card-espanola overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-pulperia-border">
          {/* Us */}
          <div className="p-4 md:p-6 flex flex-col items-center relative bg-pulperia-bg">
            <div className="absolute top-0 left-0 w-full h-1 bg-pulperia-blue" />
            <h2 className="text-xl font-bold text-pulperia-ink mb-1 font-serif">Nosotros</h2>
            <div className="flex flex-wrap justify-center gap-1 mb-4 h-[56px] overflow-hidden content-start">
              {currentMatch.teamUs.map(id => (
                <span key={id} className="text-[10px] font-bold text-pulperia-ink/70 bg-pulperia-card border border-pulperia-border px-1.5 py-0.5 rounded shadow-sm">
                  {players.find(p => p.id === id)?.name || 'Jugador'}
                </span>
              ))}
            </div>
            
            <div className="text-xs font-bold uppercase tracking-widest text-pulperia-ink/50 mb-2">
              {currentMatch.scoreUs < 15 ? 'Malas' : 'Buenas'}
            </div>

            <div className="relative mb-3">
              {currentMatch.scoreUs > 0 && isOwner && (
                <button 
                  onClick={(e) => { e.stopPropagation(); updateScore('Us', -1); }} 
                  className="absolute -top-2 -left-6 w-8 h-8 bg-pulperia-card text-pulperia-ink rounded-full flex items-center justify-center border border-pulperia-border shadow-sm hover:bg-pulperia-gold/20 transition-colors z-10"
                >
                  <Minus size={16} />
                </button>
              )}
              <div 
                onClick={() => isOwner && tapScore('Us')}
                className={`text-[6rem] md:text-[8rem] font-bebas leading-none tracking-tighter text-pulperia-ink select-none transition-transform ${isOwner ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
              >
                {currentMatch.scoreUs}
              </div>
              {tapAccumUs > 0 && (
                <div className="absolute -top-2 -right-6 w-8 h-8 bg-pulperia-blue text-white rounded-full flex items-center justify-center font-black text-sm shadow-md animate-bounce">
                  +{tapAccumUs}
                </div>
              )}
            </div>

            {/* Barra de progreso */}
            <div className="w-full mb-4 bg-pulperia-border rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-pulperia-blue transition-all duration-500"
                style={{ width: `${Math.min(100, (currentMatch.scoreUs / 30) * 100)}%` }}
              />
            </div>

            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              {/* Mobile */}
              <div className="md:hidden flex flex-col gap-2 w-full">
                <button disabled={!isOwner} onClick={() => updateScore('Us', 1, 'Punto')} className="w-full py-2.5 bg-pulperia-blue/10 text-pulperia-blue rounded-lg font-bold text-sm border border-pulperia-blue/20 hover:bg-pulperia-blue/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+1 Punto</button>
                <button disabled={!isOwner} onClick={() => updateScore('Us', 2, 'Envido / Truco')} className="w-full py-2.5 bg-pulperia-blue/10 text-pulperia-blue rounded-lg font-bold text-sm border border-pulperia-blue/20 hover:bg-pulperia-blue/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+2 Env/Tru</button>
                <button disabled={!isOwner} onClick={() => updateScore('Us', 3, 'Real Envido / Retruco')} className="w-full py-2.5 bg-pulperia-blue/10 text-pulperia-blue rounded-lg font-bold text-sm border border-pulperia-blue/20 hover:bg-pulperia-blue/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+3 R.Env/Ret</button>
                <button disabled={!isOwner} onClick={() => updateScore('Us', 4, 'Vale 4')} className="w-full py-2.5 bg-pulperia-blue/10 text-pulperia-blue rounded-lg font-bold text-sm border border-pulperia-blue/20 hover:bg-pulperia-blue/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+4 Vale 4</button>
              </div>
              {/* Desktop dividido */}
              <div className="hidden md:flex flex-col gap-2 w-full">
                {/* Punto | No Querido (+1 ambos) */}
                <div className="flex rounded-lg overflow-hidden border border-pulperia-blue/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 1, 'Punto')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+1 Punto</button>
                  <div className="w-px bg-pulperia-blue/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 1, 'No Querido')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+1 No Quer.</button>
                </div>
                {/* Envido (+2) | Truco (+2) */}
                <div className="flex rounded-lg overflow-hidden border border-pulperia-blue/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 2, 'Envido')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+2 Envido</button>
                  <div className="w-px bg-pulperia-blue/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 2, 'Truco')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+2 Truco</button>
                </div>
                {/* Real Envido (+3) | Retruco (+3) */}
                <div className="flex rounded-lg overflow-hidden border border-pulperia-blue/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 3, 'Real Envido')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+3 Real Env.</button>
                  <div className="w-px bg-pulperia-blue/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 3, 'Retruco')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+3 Retruco</button>
                </div>
                {/* Falta Envido (variable) | Vale 4 */}
                <div className="flex rounded-lg overflow-hidden border border-pulperia-blue/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => { const pts = Math.max(1, 30 - currentMatch.scoreUs); updateScore('Us', pts, 'Falta Envido'); }} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    +{Math.max(1, 30 - currentMatch.scoreUs)} F.Envido
                  </button>
                  <div className="w-px bg-pulperia-blue/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Us', 4, 'Vale 4')} className="flex-1 py-2 bg-pulperia-blue/10 text-pulperia-blue font-bold text-xs hover:bg-pulperia-blue/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+4 Vale 4</button>
                </div>
              </div>
            </div>
          </div>

          {/* Them */}
          <div className="p-4 md:p-6 flex flex-col items-center relative bg-pulperia-bg">
            <div className="absolute top-0 left-0 w-full h-1 bg-pulperia-red" />
            <h2 className="text-xl font-bold text-pulperia-ink mb-1 font-serif">Ellos</h2>
            <div className="flex flex-wrap justify-center gap-1 mb-4 h-[56px] overflow-hidden content-start">
              {currentMatch.teamThem.map(id => (
                <span key={id} className="text-[10px] font-bold text-pulperia-ink/70 bg-pulperia-card border border-pulperia-border px-1.5 py-0.5 rounded shadow-sm">
                  {players.find(p => p.id === id)?.name || 'Jugador'}
                </span>
              ))}
            </div>
            
            <div className="text-xs font-bold uppercase tracking-widest text-pulperia-ink/50 mb-2">
              {currentMatch.scoreThem < 15 ? 'Malas' : 'Buenas'}
            </div>

            <div className="relative mb-6">
              {currentMatch.scoreThem > 0 && isOwner && (
                <button 
                  onClick={(e) => { e.stopPropagation(); updateScore('Them', -1); }} 
                  className="absolute -top-2 -left-6 w-8 h-8 bg-pulperia-card text-pulperia-ink rounded-full flex items-center justify-center border border-pulperia-border shadow-sm hover:bg-pulperia-gold/20 transition-colors z-10"
                >
                  <Minus size={16} />
                </button>
              )}
              <div 
                onClick={() => isOwner && tapScore('Them')}
                className={`text-[6rem] md:text-[8rem] font-bebas leading-none tracking-tighter text-pulperia-ink select-none transition-transform ${isOwner ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
              >
                {currentMatch.scoreThem}
              </div>
              {tapAccumThem > 0 && (
                <div className="absolute -top-2 -right-6 w-8 h-8 bg-pulperia-red text-white rounded-full flex items-center justify-center font-black text-sm shadow-md animate-bounce">
                  +{tapAccumThem}
                </div>
              )}
            </div>
            {/* Barra de progreso */}
            <div className="w-full mb-4 bg-pulperia-border rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-pulperia-red transition-all duration-500"
                style={{ width: `${Math.min(100, (currentMatch.scoreThem / 30) * 100)}%` }}
              />
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              {/* Mobile */}
              <div className="md:hidden flex flex-col gap-2 w-full">
                <button disabled={!isOwner} onClick={() => updateScore('Them', 1, 'Punto')} className="w-full py-2.5 bg-pulperia-red/10 text-pulperia-red rounded-lg font-bold text-sm border border-pulperia-red/20 hover:bg-pulperia-red/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+1 Punto</button>
                <button disabled={!isOwner} onClick={() => updateScore('Them', 2, 'Envido / Truco')} className="w-full py-2.5 bg-pulperia-red/10 text-pulperia-red rounded-lg font-bold text-sm border border-pulperia-red/20 hover:bg-pulperia-red/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+2 Env/Tru</button>
                <button disabled={!isOwner} onClick={() => updateScore('Them', 3, 'Real Envido / Retruco')} className="w-full py-2.5 bg-pulperia-red/10 text-pulperia-red rounded-lg font-bold text-sm border border-pulperia-red/20 hover:bg-pulperia-red/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+3 R.Env/Ret</button>
                <button disabled={!isOwner} onClick={() => updateScore('Them', 4, 'Vale 4')} className="w-full py-2.5 bg-pulperia-red/10 text-pulperia-red rounded-lg font-bold text-sm border border-pulperia-red/20 hover:bg-pulperia-red/20 transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">+4 Vale 4</button>
              </div>
              {/* Desktop dividido */}
              <div className="hidden md:flex flex-col gap-2 w-full">
                <div className="flex rounded-lg overflow-hidden border border-pulperia-red/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 1, 'Punto')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+1 Punto</button>
                  <div className="w-px bg-pulperia-red/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 1, 'No Querido')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+1 No Quer.</button>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-pulperia-red/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 2, 'Envido')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+2 Envido</button>
                  <div className="w-px bg-pulperia-red/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 2, 'Truco')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+2 Truco</button>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-pulperia-red/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 3, 'Real Envido')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+3 Real Env.</button>
                  <div className="w-px bg-pulperia-red/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 3, 'Retruco')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+3 Retruco</button>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-pulperia-red/20 shadow-sm">
                  <button disabled={!isOwner} onClick={() => { const pts = Math.max(1, 30 - currentMatch.scoreThem); updateScore('Them', pts, 'Falta Envido'); }} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    +{Math.max(1, 30 - currentMatch.scoreThem)} F.Envido
                  </button>
                  <div className="w-px bg-pulperia-red/20" />
                  <button disabled={!isOwner} onClick={() => updateScore('Them', 4, 'Vale 4')} className="flex-1 py-2 bg-pulperia-red/10 text-pulperia-red font-bold text-xs hover:bg-pulperia-red/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+4 Vale 4</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shared History */}
        <div className="border-t border-pulperia-border bg-pulperia-card flex flex-col h-48">
          <div className="px-4 py-3 border-b border-pulperia-border flex justify-between items-center">
            <h3 className="text-xs font-bold text-pulperia-ink/60 uppercase tracking-wider">Historial de Puntos</h3>
            <button 
              onClick={undoLastPoint}
              disabled={!isOwner || !currentMatch.pointHistory || currentMatch.pointHistory.length === 0}
              className="flex items-center gap-1 text-xs font-bold text-pulperia-ink/60 hover:text-pulperia-ink disabled:opacity-30 transition-colors"
            >
              <RotateCcw size={14} /> Deshacer último
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {(!currentMatch.pointHistory || currentMatch.pointHistory.length === 0) ? (
              <p className="text-sm text-pulperia-ink/40 text-center mt-4 italic font-serif">No hay puntos registrados aún.</p>
            ) : (
              currentMatch.pointHistory.map((event) => (
                <div key={event.id} className="grid grid-cols-2 text-sm animate-in slide-in-from-bottom-2 fade-in">
                  <div className={`text-right pr-3 py-1 ${event.team === 'Us' ? 'font-bold text-pulperia-blue' : 'text-transparent'}`}>
                    {event.team === 'Us' ? `+${event.points} (${event.reason})` : '-'}
                  </div>
                  <div className={`text-left pl-3 py-1 border-l border-pulperia-border ${event.team === 'Them' ? 'font-bold text-pulperia-red' : 'text-transparent'}`}>
                    {event.team === 'Them' ? `+${event.points} (${event.reason})` : '-'}
                  </div>
                </div>
              ))
            )}
            <div ref={historyEndRef} />
          </div>
        </div>
      </div>
      
      {(currentMatch.scoreUs >= 30 || currentMatch.scoreThem >= 30) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-500">
          <div className="card-espanola max-w-sm w-full shadow-2xl text-center p-8 fileteado-border animate-in zoom-in-95 duration-500">
            {/* Espadas animadas */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-5xl animate-[spin_2s_ease-in-out_1]">⚔️</span>
            </div>
            <div className="flex justify-center gap-4 mb-2">
              <span className="text-4xl animate-bounce" style={{ animationDelay: '0ms' }}>🃏</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '150ms' }}>🃏</span>
              <span className="text-4xl animate-bounce" style={{ animationDelay: '300ms' }}>🃏</span>
            </div>
            <h2 className="text-4xl font-black text-pulperia-red font-serif mt-4 mb-1">
              ¡Truco!
            </h2>
            <h3 className="text-2xl font-bold text-pulperia-ink font-serif mb-2">
              Ganó <span className="text-pulperia-red">{currentMatch.scoreUs >= 30 ? 'Nosotros' : 'Ellos'}</span>
            </h3>
            <p className="text-pulperia-ink/60 font-serif italic text-sm mb-6">
              {currentMatch.scoreUs} — {currentMatch.scoreThem}
            </p>
            {isOwner && (
              <button
                onClick={finishMatch}
                className="w-full py-4 bg-pulperia-red text-white rounded-2xl font-bold text-lg hover:bg-red-800 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Check size={22} /> Guardar Partido
              </button>
            )}
            {!isOwner && (
              <p className="text-pulperia-ink/50 text-sm italic font-serif">El organizador guardará el resultado.</p>
            )}
          </div>
        </div>
      )}

      {/* Barra inferior: Finalizar + menú flotante — solo durante el partido */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-pulperia-bg via-pulperia-bg to-transparent">
        <div className="max-w-3xl mx-auto flex gap-2">
          {isOwner && (
            <button
              onClick={() => setIsConfirming(true)}
              className="flex-1 py-4 bg-pulperia-ink text-white rounded-2xl font-bold text-base hover:bg-zinc-800 transition-all shadow-xl flex items-center justify-center gap-2 border border-pulperia-border"
            >
              <Check size={20} /> Finalizar Partido
            </button>
          )}

          {/* Botón de menú — abre las otras secciones sin salir del partido */}
          <div className="relative md:hidden">
            {floatingMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFloatingMenuOpen(false)} />
                <div className="absolute bottom-full mb-2 right-0 bg-pulperia-card border border-pulperia-border rounded-2xl shadow-xl overflow-hidden z-50 w-48 animate-in slide-in-from-bottom-2 fade-in duration-150">
                  {[
                    { path: '/stats', label: 'Estadísticas' },
                    { path: '/players', label: 'Jugadores' },
                    { path: '/history', label: 'Historial' },
                    { path: '/settings', label: 'Perfil' },
                  ].map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setFloatingMenuOpen(false)}
                      className="flex items-center px-4 py-3 text-sm font-semibold font-serif text-pulperia-ink/70 hover:bg-pulperia-bg transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setFloatingMenuOpen(prev => !prev)}
              className="h-full px-4 bg-pulperia-card border border-pulperia-border text-pulperia-ink rounded-2xl shadow-xl flex items-center justify-center transition-all hover:bg-pulperia-bg active:scale-95"
            >
              {floatingMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Finalizar */}
      {isConfirming && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="card-espanola p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-2xl font-bold text-pulperia-ink mb-2 font-serif">Finalizar partido</h3>
            <p className="text-pulperia-ink/70 text-sm mb-6 italic font-serif">¿Estás seguro de que quieres finalizar este partido? Los resultados se guardarán en el historial.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirming(false)} className="flex-1 py-2 px-4 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-lg font-bold hover:bg-pulperia-gold/20 transition-colors shadow-sm">Cancelar</button>
              <button onClick={finishMatch} className="flex-1 py-2 px-4 bg-pulperia-red text-white rounded-lg font-bold hover:bg-red-800 transition-colors shadow-sm">Finalizar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Abandonar (guarda el partido con puntaje actual) */}
      {isConfirmingAbandon && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="card-espanola p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-pulperia-red">
              <Flag size={22} />
              <h3 className="text-2xl font-bold font-serif">Abandonar partido</h3>
            </div>
            <p className="text-pulperia-ink/70 text-sm mb-6 italic font-serif">
              El partido se guardará en el historial con el puntaje actual. ¿Confirmás?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmingAbandon(false)} className="flex-1 py-2 px-4 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-lg font-bold hover:bg-pulperia-gold/20 transition-colors shadow-sm">Cancelar</button>
              <button onClick={abandonMatch} className="flex-1 py-2 px-4 bg-pulperia-red text-white rounded-lg font-bold hover:bg-red-800 transition-colors shadow-sm">Abandonar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Irse al mazo (borra el partido sin guardar) */}
      {isConfirmingMazo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="card-espanola p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-pulperia-ink">
              <X size={22} />
              <h3 className="text-2xl font-bold font-serif">Irse al mazo</h3>
            </div>
            <p className="text-pulperia-ink/70 text-sm mb-6 italic font-serif">
              El partido se cancelará y <strong>no se guardará</strong> en el historial. Como si nunca hubiera existido. ¿Confirmás?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmingMazo(false)} className="flex-1 py-2 px-4 bg-pulperia-bg border border-pulperia-border text-pulperia-ink rounded-lg font-bold hover:bg-pulperia-gold/20 transition-colors shadow-sm">Cancelar</button>
              <button onClick={irseAlMazo} className="flex-1 py-2 px-4 bg-pulperia-ink text-white rounded-lg font-bold hover:bg-zinc-700 transition-colors shadow-sm">Al mazo</button>
            </div>
          </div>
        </div>
      )}

      {showGuestWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="card-espanola p-6 max-w-sm w-full shadow-xl relative">
            <button onClick={dismissGuestWarning} className="absolute top-4 right-4 text-pulperia-ink/50 hover:text-pulperia-ink transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-pulperia-red">
              <AlertCircle size={28} />
              <h3 className="text-2xl font-bold font-serif">Modo Invitado</h3>
            </div>
            <p className="text-pulperia-ink/80 text-sm mb-6 font-serif">
              Estás usando la aplicación como invitado. Si cierras sesión o cambias de dispositivo, <strong>perderás tu historial de partidos y estadísticas</strong>.
              <br/><br/>
              Para guardar tu progreso y usar todas las funciones, inicia sesión con Google desde la sección de Perfil.
            </p>
            <div className="flex gap-3">
              <button onClick={dismissGuestWarning} className="w-full py-3 px-4 bg-pulperia-red text-white rounded-xl font-bold hover:bg-red-800 transition-colors shadow-sm">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
