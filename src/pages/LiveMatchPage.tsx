import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Wifi, WifiOff } from 'lucide-react';

interface LiveMatch {
  id: string;
  teamUsNames: string[];
  teamThemNames: string[];
  scoreUs: number;
  scoreThem: number;
  status: 'in-progress' | 'completed';
  pointHistory?: { id: string; team: 'Us' | 'Them'; points: number; reason: string; timestamp: number }[];
}

export default function LiveMatchPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [connected, setConnected] = useState(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(
      doc(db, 'matches', id),
      (snap) => {
        setConnected(true);
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setMatch({
          id: snap.id,
          teamUsNames: data.teamUsNames || ['Nosotros'],
          teamThemNames: data.teamThemNames || ['Ellos'],
          scoreUs: data.scoreUs,
          scoreThem: data.scoreThem,
          status: data.status,
          pointHistory: data.pointHistory || [],
        });
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        setLoading(false);
      },
      () => {
        setConnected(false);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-pulperia-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pulperia-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pulperia-ink/60 font-serif italic">Conectando al partido...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-pulperia-bg flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-6xl mb-4">🃏</p>
          <h1 className="text-2xl font-bold text-pulperia-ink font-serif mb-2">Partido no encontrado</h1>
          <p className="text-pulperia-ink/60 font-serif italic mb-6">Este partido no existe o ya fue eliminado.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-pulperia-red text-white rounded-xl font-bold hover:bg-red-800 transition-colors">
            Ir a Truco Tracker
          </Link>
        </div>
      </div>
    );
  }

  if (!match) return null;

  const usWon = match.scoreUs >= 30;
  const themWon = match.scoreThem >= 30;
  const finished = match.status === 'completed';
  const usNames = match.teamUsNames.join(' & ');
  const themNames = match.teamThemNames.join(' & ');

  return (
    <div className="min-h-screen bg-pulperia-bg flex flex-col">

      {/* Header */}
      <header className="bg-pulperia-card border-b border-pulperia-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-pulperia-red font-serif">Truco Tracker</span>
          <span className="text-xs text-pulperia-ink/40 font-serif italic">• en vivo</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${connected ? 'text-green-600' : 'text-zinc-400'}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'En vivo' : 'Sin conexión'}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-4 gap-4 max-w-md mx-auto w-full pt-6">

        {/* Estado del partido */}
        {finished ? (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 fileteado-border">
            <Trophy className="text-amber-500 shrink-0" size={22} />
            <p className="text-sm font-bold text-amber-800 font-serif">
              Partido finalizado · Ganó <span className="text-pulperia-red">{usWon ? usNames : themNames}</span>
            </p>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-1">
            <span className={`w-2 h-2 rounded-full bg-green-500 ${pulse ? 'scale-150' : ''} transition-transform`} />
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Partido en curso</span>
          </div>
        )}

        {/* Scoreboard */}
        <div className={`w-full card-espanola overflow-hidden fileteado-border ${pulse ? 'scale-[1.01]' : ''} transition-transform duration-300`}>

          {/* Encabezado del marcador */}
          <div className="grid grid-cols-2 divide-x divide-pulperia-border">

            {/* Nosotros */}
            <div className="p-5 flex flex-col items-center bg-pulperia-bg relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-pulperia-blue" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-pulperia-ink/50 mb-1">Nosotros</p>
              <p className="text-sm font-bold text-pulperia-blue text-center leading-tight mb-3 font-serif">{usNames}</p>
              <div className={`text-[5rem] font-black leading-none tabular-nums transition-all duration-300 ${usWon ? 'text-pulperia-blue' : 'text-pulperia-ink'}`}>
                {match.scoreUs}
              </div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-pulperia-ink/40 mt-2">
                {match.scoreUs < 15 ? 'Malas' : 'Buenas'}
              </p>
              {/* Barra de progreso */}
              <div className="w-full mt-3 bg-pulperia-border rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-pulperia-blue transition-all duration-500"
                  style={{ width: `${Math.min(100, (match.scoreUs / 30) * 100)}%` }}
                />
              </div>
            </div>

            {/* Ellos */}
            <div className="p-5 flex flex-col items-center bg-pulperia-bg relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-pulperia-red" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-pulperia-ink/50 mb-1">Ellos</p>
              <p className="text-sm font-bold text-pulperia-red text-center leading-tight mb-3 font-serif">{themNames}</p>
              <div className={`text-[5rem] font-black leading-none tabular-nums transition-all duration-300 ${themWon ? 'text-pulperia-red' : 'text-pulperia-ink'}`}>
                {match.scoreThem}
              </div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-pulperia-ink/40 mt-2">
                {match.scoreThem < 15 ? 'Malas' : 'Buenas'}
              </p>
              {/* Barra de progreso */}
              <div className="w-full mt-3 bg-pulperia-border rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-pulperia-red transition-all duration-500"
                  style={{ width: `${Math.min(100, (match.scoreThem / 30) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Meta: 30 puntos */}
          <div className="px-4 py-2 bg-pulperia-card border-t border-pulperia-border text-center">
            <p className="text-[10px] font-bold tracking-widest uppercase text-pulperia-ink/30">Meta: 30 puntos</p>
          </div>
        </div>

        {/* Historial de puntos */}
        {match.pointHistory && match.pointHistory.length > 0 && (
          <div className="w-full card-espanola overflow-hidden">
            <div className="px-4 py-3 border-b border-pulperia-border">
              <h3 className="text-xs font-bold uppercase tracking-widest text-pulperia-ink/50">Historial de puntos</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {[...match.pointHistory].reverse().map((event, i) => (
                <div
                  key={event.id}
                  className={`grid grid-cols-2 text-sm border-b border-pulperia-border/50 last:border-0 ${i === 0 && pulse ? 'bg-pulperia-gold/10' : ''} transition-colors`}
                >
                  <div className={`text-right pr-4 py-2.5 ${event.team === 'Us' ? 'font-bold text-pulperia-blue' : 'text-transparent'}`}>
                    {event.team === 'Us' ? `+${event.points} ${event.reason}` : '·'}
                  </div>
                  <div className={`text-left pl-4 py-2.5 border-l border-pulperia-border ${event.team === 'Them' ? 'font-bold text-pulperia-red' : 'text-transparent'}`}>
                    {event.team === 'Them' ? `+${event.points} ${event.reason}` : '·'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA para descargar la app */}
        <div className="w-full text-center py-4">
          <p className="text-xs text-pulperia-ink/40 font-serif italic mb-2">¿Querés registrar tus propios partidos?</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-pulperia-red text-white rounded-xl font-bold text-sm hover:bg-red-800 transition-colors shadow-sm"
          >
            Abrir Truco Tracker
          </Link>
        </div>

      </main>
    </div>
  );
}
