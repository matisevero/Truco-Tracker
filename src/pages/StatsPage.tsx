import { useMemo, useState } from 'react';
import { useTrucoData } from '../hooks/useTrucoData';
import { getSpanishCardAvatar } from '../utils/avatar';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { Trophy, Flame, Skull, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MedalCard = ({ title, desc, player, value, icon }: any) => (
  <div className="card-espanola p-4 flex flex-col items-center text-center">
    <div className="w-12 h-12 bg-[#fdfbf7] rounded-full shadow-sm flex items-center justify-center mb-3 border border-[#e8e4d9]">
      {icon}
    </div>
    <h3 className="font-bold text-pulperia-blue text-sm mb-1">{title}</h3>
    <p className="text-[10px] text-pulperia-red font-bold tracking-wider mb-3">{desc}</p>
    
    {player.name !== '-' ? (
      <div className="flex flex-col items-center gap-2">
        <img 
          src={player.photoUrl || getSpanishCardAvatar(player.name)} 
          alt={player.name} 
          className="w-10 h-10 rounded-full bg-white object-cover border-2 border-pulperia-gold"
          referrerPolicy="no-referrer"
        />
        <div>
          <p className="font-bold text-pulperia-blue text-sm">{player.name}</p>
          <p className="text-xs font-black text-pulperia-red">{value}</p>
        </div>
      </div>
    ) : (
      <p className="text-xs text-pulperia-blue/50 italic font-medium">Aún no hay datos</p>
    )}
  </div>
);

export default function StatsPage() {
  const { matches, players } = useTrucoData();

  const [hideWon, setHideWon] = useState(false);
  const [hideLost, setHideLost] = useState(false);

  const handleLegendClick = (e: any) => {
    if (e.dataKey === 'A' || e.dataKey === 'hiddenA') setHideWon(prev => !prev);
    if (e.dataKey === 'B' || e.dataKey === 'hiddenB') setHideLost(prev => !prev);
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex justify-center gap-4 text-xs mt-2">
        {payload.map((entry: any, index: number) => {
          const isHidden = (entry.dataKey === 'hiddenA') || (entry.dataKey === 'hiddenB');
          return (
            <li key={`item-${index}`} className="flex items-center gap-1 cursor-pointer" onClick={() => handleLegendClick(entry)}>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color, opacity: isHidden ? 0.3 : 1 }}></span>
              <span style={{ color: isHidden ? '#a1a1aa' : '#2b4c7e', fontWeight: 'bold' }}>{entry.value}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const stats = useMemo(() => {
    const completed = matches.filter(m => m.status === 'completed');
    
    let totalPointsPlayed = 0;
    const playerStatsMap: Record<string, { played: number, won: number }> = {};
    const teamStatsMap: Record<string, { played: number, won: number }> = {};

    const monthsMap: Record<string, number> = {};

    completed.forEach(m => {
      totalPointsPlayed += m.scoreUs + m.scoreThem;

      if (m.date) {
        const d = m.date.toDate ? m.date.toDate() : new Date(m.date);
        const monthKey = format(d, 'MMM yyyy', { locale: es });
        monthsMap[monthKey] = (monthsMap[monthKey] || 0) + 1;
      }

      const usWon = m.scoreUs > m.scoreThem;
      const themWon = m.scoreThem > m.scoreUs;

      // Player stats
      [...m.teamUs, ...m.teamThem].forEach(playerId => {
        if (!playerStatsMap[playerId]) playerStatsMap[playerId] = { played: 0, won: 0 };
        playerStatsMap[playerId].played++;
      });

      m.teamUs.forEach(playerId => {
        if (usWon) playerStatsMap[playerId].won++;
      });
      m.teamThem.forEach(playerId => {
        if (themWon) playerStatsMap[playerId].won++;
      });

      // Team stats
      const teamUsKey = [...m.teamUs].sort().join(',');
      const teamThemKey = [...m.teamThem].sort().join(',');

      if (!teamStatsMap[teamUsKey]) teamStatsMap[teamUsKey] = { played: 0, won: 0 };
      teamStatsMap[teamUsKey].played++;
      if (usWon) teamStatsMap[teamUsKey].won++;

      if (!teamStatsMap[teamThemKey]) teamStatsMap[teamThemKey] = { played: 0, won: 0 };
      teamStatsMap[teamThemKey].played++;
      if (themWon) teamStatsMap[teamThemKey].won++;
    });

    const monthsData = Object.entries(monthsMap).map(([name, count]) => ({ name, count }));

    let topPlayer = { name: '-', winRate: 0, photoUrl: '' };
    let mostActivePlayer = { name: '-', played: 0, photoUrl: '' };
    let mostLostPlayer = { name: '-', lost: 0, photoUrl: '' };

    Object.entries(playerStatsMap).forEach(([id, s]) => {
      const p = players.find(pl => pl.id === id);
      if (!p) return;
      
      if (s.played > mostActivePlayer.played) {
        mostActivePlayer = { name: p.name, played: s.played, photoUrl: p.photoUrl || '' };
      }

      if (s.played >= 3) {
        const winRate = (s.won / s.played) * 100;
        if (winRate > topPlayer.winRate) {
          topPlayer = { name: p.name, winRate, photoUrl: p.photoUrl || '' };
        }
      }

      const lost = s.played - s.won;
      if (lost > mostLostPlayer.lost) {
        mostLostPlayer = { name: p.name, lost, photoUrl: p.photoUrl || '' };
      }
    });

    const playerStreaks: Record<string, { current: number, max: number }> = {};
    players.forEach(p => playerStreaks[p.id] = { current: 0, max: 0 });
    
    [...completed].reverse().forEach(m => {
      const usWon = m.scoreUs > m.scoreThem;
      m.teamUs.forEach(id => {
        if (!playerStreaks[id]) return;
        if (usWon) {
          playerStreaks[id].current++;
          playerStreaks[id].max = Math.max(playerStreaks[id].max, playerStreaks[id].current);
        } else {
          playerStreaks[id].current = 0;
        }
      });
      m.teamThem.forEach(id => {
        if (!playerStreaks[id]) return;
        if (!usWon) {
          playerStreaks[id].current++;
          playerStreaks[id].max = Math.max(playerStreaks[id].max, playerStreaks[id].current);
        } else {
          playerStreaks[id].current = 0;
        }
      });
    });

    let highestStreakPlayer = { name: '-', streak: 0, photoUrl: '' };
    Object.entries(playerStreaks).forEach(([id, s]) => {
      if (s.max > highestStreakPlayer.streak) {
        const p = players.find(pl => pl.id === id);
        if (p) {
          highestStreakPlayer = { name: p.name, streak: s.max, photoUrl: p.photoUrl || '' };
        }
      }
    });

    let topTeam = { name: '-', winRate: 0, played: 0 };
    Object.entries(teamStatsMap).forEach(([key, s]) => {
      if (s.played >= 2) {
        const winRate = (s.won / s.played) * 100;
        if (winRate > topTeam.winRate) {
          const names = key.split(',').map(id => players.find(p => p.id === id)?.name || 'Jugador').join(' + ');
          topTeam = { name: names, winRate, played: s.played };
        }
      }
    });

    const radarData = Object.entries(playerStatsMap).map(([id, s]) => {
      const p = players.find(pl => pl.id === id);
      return {
        subject: p?.name || 'Jugador',
        A: s.won,
        B: s.played - s.won, // lost
        fullMark: Math.max(...Object.values(playerStatsMap).map(st => st.played))
      };
    }).filter(d => d.A + d.B > 0); // Only players with matches

    return {
      totalPlayed: completed.length,
      totalPointsPlayed,
      monthsData,
      topPlayer,
      mostActivePlayer,
      mostLostPlayer,
      highestStreakPlayer,
      topTeam,
      radarData
    };
  }, [matches, players]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-pulperia-red fileteado-border inline-block px-8 py-2 bg-[#fdfbf7]">Estadísticas</h1>
        <p className="text-pulperia-blue/70 text-sm mt-4 font-medium">Resumen de todos los partidos jugados en la pulpería.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-espanola p-5 text-center">
          <p className="text-xs font-bold text-pulperia-blue/70 tracking-wider mb-1">Partidos Jugados</p>
          <p className="text-3xl font-black text-pulperia-red">{stats.totalPlayed}</p>
        </div>
        <div className="card-espanola p-5 text-center">
          <p className="text-xs font-bold text-pulperia-blue/70 tracking-wider mb-1">Puntos Jugados</p>
          <p className="text-3xl font-black text-pulperia-red">{stats.totalPointsPlayed}</p>
        </div>
        <div className="card-espanola p-5 text-center">
          <p className="text-xs font-bold text-pulperia-blue/70 tracking-wider mb-1">Mejor Jugador</p>
          <p className="text-xl font-bold text-pulperia-blue truncate">{stats.topPlayer.name}</p>
          <p className="text-xs text-pulperia-gold font-bold mt-1">{stats.topPlayer.winRate.toFixed(1)}% Victorias</p>
        </div>
        <div className="card-espanola p-5 text-center">
          <p className="text-xs font-bold text-pulperia-blue/70 tracking-wider mb-1">Mejor Equipo</p>
          <p className="text-sm font-bold text-pulperia-blue truncate">{stats.topTeam.name}</p>
          <p className="text-xs text-pulperia-gold font-bold mt-1">{stats.topTeam.winRate.toFixed(1)}% Vic ({stats.topTeam.played} PJ)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card-espanola p-5">
          <h2 className="text-lg font-bold text-pulperia-red mb-6 text-center fileteado-border py-1">Partidos por Mes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e4d9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#2b4c7e', fontSize: 12, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#2b4c7e', fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#fdfbf7' }} contentStyle={{ borderRadius: '12px', border: '2px solid #e8e4d9', backgroundColor: '#fdfbf7', color: '#2b4c7e', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#2b4c7e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-espanola p-5">
          <h2 className="text-lg font-bold text-pulperia-red mb-6 text-center fileteado-border py-1">Radar de Jugadores</h2>
          <div className="h-64">
            {stats.radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                  <PolarGrid stroke="#e8e4d9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#2b4c7e', fontSize: 10, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar name="Ganados" dataKey={hideWon ? "hiddenA" : "A"} stroke="#2b4c7e" fill="#2b4c7e" fillOpacity={0.5} dot={{ r: 4, fillOpacity: 1 }} />
                  <Radar name="Perdidos" dataKey={hideLost ? "hiddenB" : "B"} stroke="#c84b31" fill="#c84b31" fillOpacity={0.5} dot={{ r: 4, fillOpacity: 1 }} />
                  <Legend content={renderLegend} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #e8e4d9', backgroundColor: '#fdfbf7', color: '#2b4c7e', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-pulperia-blue/50 font-medium text-sm text-center">
                Se necesitan al menos 3 jugadores con partidos<br/>para mostrar el radar.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-espanola p-5">
        <h2 className="text-lg font-bold text-pulperia-red mb-6 flex items-center justify-center gap-2 fileteado-border py-1">
          <Trophy className="text-pulperia-gold" size={24} /> Logros y Medallas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MedalCard 
            title="El Invencible" 
            desc="Mayor % de victorias (min 3 PJ)" 
            player={stats.topPlayer} 
            value={`${stats.topPlayer.winRate.toFixed(1)}%`} 
            icon={<Trophy size={20} className="text-pulperia-gold" />} 
          />
          <MedalCard 
            title="En Racha" 
            desc="Mayor racha de victorias" 
            player={stats.highestStreakPlayer} 
            value={`${stats.highestStreakPlayer.streak} seguidas`} 
            icon={<Flame size={20} className="text-pulperia-red" />} 
          />
          <MedalCard 
            title="El Salado" 
            desc="Más partidos perdidos" 
            player={stats.mostLostPlayer} 
            value={`${stats.mostLostPlayer.lost} perdidos`} 
            icon={<Skull size={20} className="text-pulperia-blue" />} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-espanola p-5">
          <h2 className="text-lg font-bold text-pulperia-red mb-6 text-center fileteado-border py-1">Jugador Más Activo</h2>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-20 h-20 bg-[#fdfbf7] rounded-full flex items-center justify-center mb-4 border-4 border-[#e8e4d9] shadow-sm overflow-hidden">
              {stats.mostActivePlayer.photoUrl ? (
                <img src={stats.mostActivePlayer.photoUrl} alt={stats.mostActivePlayer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <img src={getSpanishCardAvatar(stats.mostActivePlayer.name)} alt={stats.mostActivePlayer.name} className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-pulperia-blue">{stats.mostActivePlayer.name}</h3>
            <p className="text-pulperia-red font-bold mt-2">{stats.mostActivePlayer.played} partidos jugados</p>
          </div>
        </div>

        <div className="card-espanola p-5">
          <h2 className="text-lg font-bold text-pulperia-red mb-6 text-center fileteado-border py-1">Mejor Equipo</h2>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-20 h-20 bg-[#fdfbf7] rounded-full flex items-center justify-center mb-4 border-4 border-[#e8e4d9] shadow-sm">
              <span className="text-3xl font-black text-pulperia-gold">
                {stats.topTeam.winRate.toFixed(0)}%
              </span>
            </div>
            <h3 className="text-xl font-bold text-pulperia-blue px-4">{stats.topTeam.name}</h3>
            <p className="text-pulperia-red font-bold mt-2">{stats.topTeam.played} partidos jugados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
