import { useState, useMemo, useEffect } from 'react';
import { useTrucoData, Match } from '../hooks/useTrucoData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users, ChevronDown, ChevronUp, Trash2, Edit2, X } from 'lucide-react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getSpanishCardAvatar } from '../utils/avatar';

export default function HistoryPage() {
  const { matches, players } = useTrucoData();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [filterPlayerId, setFilterPlayerId] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  
  const [deletingMatch, setDeletingMatch] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editScoreUs, setEditScoreUs] = useState('');
  const [editScoreThem, setEditScoreThem] = useState('');
  const [editTeamUs, setEditTeamUs] = useState<string[]>([]);
  const [editTeamThem, setEditTeamThem] = useState<string[]>([]);

  const completedMatches = matches.filter(m => m.status === 'completed');

  useEffect(() => {
    if (completedMatches.length > 0 && Object.keys(expandedMatches).length === 0) {
      setExpandedMatches({ [completedMatches[0].id]: true });
    }
  }, [completedMatches]);

  const handleDelete = async () => {
    if (!deletingMatch) return;
    try {
      await deleteDoc(doc(db, 'matches', deletingMatch));
      setDeletingMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${deletingMatch}`);
    }
  };

  const handleEdit = async () => {
    if (!editingMatch) return;
    const us = parseInt(editScoreUs, 10);
    const them = parseInt(editScoreThem, 10);
    if (isNaN(us) || isNaN(them)) return;
    if (editTeamUs.length === 0 || editTeamThem.length === 0) return;
    
    try {
      await updateDoc(doc(db, 'matches', editingMatch.id), {
        scoreUs: us,
        scoreThem: them,
        teamUs: editTeamUs,
        teamThem: editTeamThem,
        teamUsNames: editTeamUs.map(id => players.find(p => p.id === id)?.name || 'Jugador'),
        teamThemNames: editTeamThem.map(id => players.find(p => p.id === id)?.name || 'Jugador'),
      });
      setEditingMatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `matches/${editingMatch.id}`);
    }
  };

  const openEditModal = (match: Match, e: any) => {
    e.stopPropagation();
    setEditingMatch(match);
    setEditScoreUs(match.scoreUs.toString());
    setEditScoreThem(match.scoreThem.toString());
    setEditTeamUs(match.teamUs || []);
    setEditTeamThem(match.teamThem || []);
  };

  const toggleEditPlayer = (team: 'Us' | 'Them', playerId: string) => {
    if (team === 'Us') {
      setEditTeamUs(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
      setEditTeamThem(prev => prev.filter(id => id !== playerId));
    } else {
      setEditTeamThem(prev =>
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
      setEditTeamUs(prev => prev.filter(id => id !== playerId));
    }
  };

  const years = useMemo(() => {
    const y = new Set<number>();
    completedMatches.forEach(m => {
      if (m.date) {
        const date = m.date.toDate ? m.date.toDate() : new Date(m.date);
        y.add(date.getFullYear());
      }
    });
    return Array.from(y).sort((a, b) => b - a);
  }, [completedMatches]);

  const filteredMatches = useMemo(() => {
    return completedMatches.filter(m => {
      const yearOk = selectedYear === 'all' || (() => {
        if (!m.date) return false;
        const date = m.date.toDate ? m.date.toDate() : new Date(m.date);
        return date.getFullYear() === selectedYear;
      })();
      const playerOk = !filterPlayerId || [...m.teamUs, ...m.teamThem].includes(filterPlayerId);
      return yearOk && playerOk;
    });
  }, [completedMatches, selectedYear, filterPlayerId]);

  const getPlayerNames = (ids: string[]) => {
    return ids.map(id => players.find(p => p.id === id)?.name || 'Desconocido').join(', ');
  };

  const toggleExpand = (id: string) => {
    setExpandedMatches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Historial</h1>
          <p className="text-zinc-500 text-sm mt-1">Revisa todos los partidos jugados.</p>
        </div>
        
        {years.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedYear('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                selectedYear === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Todos
            </button>
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  selectedYear === year ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Filtro por jugador */}
      {players.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
          <button
            onClick={() => setFilterPlayerId(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              !filterPlayerId ? 'bg-pulperia-red text-white' : 'bg-pulperia-card border border-pulperia-border text-pulperia-ink/60 hover:bg-pulperia-bg'
            }`}
          >
            Todos los jugadores
          </button>
          {players.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPlayerId(prev => prev === p.id ? null : p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                filterPlayerId === p.id ? 'bg-pulperia-blue text-white' : 'bg-pulperia-card border border-pulperia-border text-pulperia-ink/60 hover:bg-pulperia-bg'
              }`}
            >
              <img src={p.photoUrl || getSpanishCardAvatar(p.name)} className="w-4 h-4 rounded-full object-cover" alt="" />
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredMatches.map(match => {
          const usWon = match.scoreUs > match.scoreThem;
          const date = match.date?.toDate ? match.date.toDate() : new Date(match.date);
          const isExpanded = expandedMatches[match.id];

          return (
            <div 
              key={match.id} 
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden transition-all hover:shadow-md cursor-pointer"
              onClick={() => toggleExpand(match.id)}
            >
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-zinc-500 font-medium text-xs w-24 sm:w-32 shrink-0">
                  <Calendar size={14} />
                  <span className="truncate">{match.date ? format(date, "d MMM, yy", { locale: es }) : 'Desc.'}</span>
                </div>

                <div className="flex-1 flex items-center justify-center gap-4">
                  <div className="flex-1 text-right">
                    <p className={`font-bold text-sm sm:text-base ${usWon ? 'text-zinc-900' : 'text-zinc-500'}`}>Nosotros</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0 px-2 bg-zinc-50 rounded-lg py-1">
                    <span className={`text-xl font-black tabular-nums ${usWon ? 'text-blue-600' : 'text-zinc-400'}`}>
                      {match.scoreUs}
                    </span>
                    <span className="text-zinc-300 font-black text-lg">-</span>
                    <span className={`text-xl font-black tabular-nums ${!usWon ? 'text-red-600' : 'text-zinc-400'}`}>
                      {match.scoreThem}
                    </span>
                  </div>

                  <div className="flex-1 text-left">
                    <p className={`font-bold text-sm sm:text-base ${!usWon ? 'text-zinc-900' : 'text-zinc-500'}`}>Ellos</p>
                  </div>
                </div>

                <div className="text-zinc-400 shrink-0">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-4 text-sm animate-in slide-in-from-top-2">
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 text-right">
                      <p className="text-[10px] font-bold tracking-wider text-zinc-400 mb-1">Equipo Nosotros</p>
                      <p className="font-medium text-zinc-700">{getPlayerNames(match.teamUs)}</p>
                    </div>
                    <div className="w-10 shrink-0"></div>
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-bold tracking-wider text-zinc-400 mb-1">Equipo Ellos</p>
                      <p className="font-medium text-zinc-700">{getPlayerNames(match.teamThem)}</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-2 pt-2 border-t border-zinc-200/50 flex-wrap">
                    <button 
                      onClick={(e) => openEditModal(match, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold hover:bg-zinc-300 transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    {match.teamUs.length > 0 && match.teamThem.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const allIds = [...match.teamUs, ...match.teamThem];
                          window.location.href = `/stats?h2h=${allIds.join(',')}`;
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pulperia-gold/20 text-pulperia-gold rounded-lg text-xs font-bold hover:bg-pulperia-gold/30 transition-colors border border-pulperia-gold/30"
                        style={{ color: '#b8960c' }}
                      >
                        ⚔️ Head-to-Head
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingMatch(match.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-300 mb-3" />
            <h3 className="text-base font-bold text-zinc-900">No hay partidos</h3>
            <p className="text-zinc-500 text-sm">
              {selectedYear === 'all' ? 'Juega tu primer partido para verlo aquí.' : `No hay partidos en el año ${selectedYear}.`}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Eliminar Partido</h3>
            <p className="text-zinc-500 text-sm mb-6">¿Estás seguro de que quieres eliminar este partido? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingMatch(null)}
                className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-zinc-900">Editar Partido</h3>
              <button onClick={() => setEditingMatch(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Puntajes */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Puntaje</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-blue-500 tracking-wider mb-1">Nosotros</label>
                  <input
                    type="number"
                    value={editScoreUs}
                    onChange={(e) => setEditScoreUs(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-sm text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-red-500 tracking-wider mb-1">Ellos</label>
                  <input
                    type="number"
                    value={editScoreThem}
                    onChange={(e) => setEditScoreThem(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium text-sm text-center"
                  />
                </div>
              </div>
            </div>

            {/* Equipos */}
            {players.length > 0 && (
              <div className="space-y-4 mb-6">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Equipos</p>

                {/* Equipo Nosotros */}
                <div>
                  <p className="text-xs font-bold text-blue-500 mb-2">Nosotros</p>
                  <div className="flex flex-wrap gap-2">
                    {players.map(p => {
                      const inUs = editTeamUs.includes(p.id);
                      const inThem = editTeamThem.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleEditPlayer('Us', p.id)}
                          disabled={inThem}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            inUs
                              ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                              : inThem
                              ? 'bg-zinc-100 text-zinc-300 border-zinc-200 cursor-not-allowed'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-300'
                          }`}
                        >
                          <img
                            src={p.photoUrl || getSpanishCardAvatar(p.name)}
                            className="w-4 h-4 rounded-full object-cover bg-white"
                            alt=""
                          />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Equipo Ellos */}
                <div>
                  <p className="text-xs font-bold text-red-500 mb-2">Ellos</p>
                  <div className="flex flex-wrap gap-2">
                    {players.map(p => {
                      const inThem = editTeamThem.includes(p.id);
                      const inUs = editTeamUs.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleEditPlayer('Them', p.id)}
                          disabled={inUs}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            inThem
                              ? 'bg-red-500 text-white border-red-500 shadow-sm'
                              : inUs
                              ? 'bg-zinc-100 text-zinc-300 border-zinc-200 cursor-not-allowed'
                              : 'bg-white text-zinc-600 border-zinc-200 hover:border-red-300'
                          }`}
                        >
                          <img
                            src={p.photoUrl || getSpanishCardAvatar(p.name)}
                            className="w-4 h-4 rounded-full object-cover bg-white"
                            alt=""
                          />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditingMatch(null)}
                className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={editTeamUs.length === 0 || editTeamThem.length === 0}
                className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
