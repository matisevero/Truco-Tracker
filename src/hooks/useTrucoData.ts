import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';

export interface Player {
  id: string;
  name: string;
  createdBy: string;
  createdAt: any;
  email?: string;
  phone?: string;
  photoUrl?: string;
  linkedUserId?: string;
}

export interface PointEvent {
  id: string;
  team: 'Us' | 'Them';
  points: number;
  reason: string;
  timestamp: number;
}

export interface Match {
  id: string;
  date: any;
  teamUs: string[];
  teamThem: string[];
  teamUsNames?: string[];
  teamThemNames?: string[];
  scoreUs: number;
  scoreThem: number;
  status: 'in-progress' | 'completed';
  createdBy: string;
  pointHistory?: PointEvent[];
}

// Ordena y deduplica un array de matches por ID, más reciente primero
function mergeMatches(a: Match[], b: Match[]): Match[] {
  const map = new Map<string, Match>();
  [...a, ...b].forEach(m => map.set(m.id, m));
  return Array.from(map.values()).sort((x, y) => {
    const dx = x.date?.toDate?.()?.getTime() ?? 0;
    const dy = y.date?.toDate?.()?.getTime() ?? 0;
    return dy - dx;
  });
}

export function useTrucoData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null);

  // Refs para poder mergear desde cualquier listener
  const ownMatchesRef = useRef<Match[]>([]);
  const linkedMatchesRef = useRef<Match[]>([]);

  // Paso 1: buscar si el usuario tiene un jugador vinculado por email
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous || !user.email) return;

    const findLinked = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'players'), where('email', '==', user.email))
        );
        if (!snap.empty) {
          // Tomar el jugador que no sea del propio usuario (fue creado por otro)
          const external = snap.docs.find(d => d.data().createdBy !== user.uid);
          if (external) setLinkedPlayerId(external.id);
        }
      } catch (e) {
        // No crítico
      }
    };

    findLinked();
  }, [auth.currentUser?.uid]);

  // Paso 2: suscribir a jugadores y partidos (propios + vinculados)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;

    // ── Jugadores propios ──────────────────────────────────
    const unsubPlayers = onSnapshot(
      query(collection(db, 'players'), where('createdBy', '==', uid), orderBy('createdAt', 'desc')),
      snap => setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player))),
      err => handleFirestoreError(err, OperationType.LIST, 'players')
    );

    // ── Partidos propios ───────────────────────────────────
    const unsubOwnMatches = onSnapshot(
      query(collection(db, 'matches'), where('createdBy', '==', uid), orderBy('date', 'desc')),
      snap => {
        ownMatchesRef.current = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
        setMatches(mergeMatches(ownMatchesRef.current, linkedMatchesRef.current));
        setLoading(false);
      },
      err => handleFirestoreError(err, OperationType.LIST, 'matches')
    );

    // ── Partidos donde el usuario es jugador vinculado ─────
    let unsubLinkedUs: (() => void) | null = null;
    let unsubLinkedThem: (() => void) | null = null;

    if (linkedPlayerId) {
      // Partidos donde el jugador vinculado está en teamUs
      unsubLinkedUs = onSnapshot(
        query(collection(db, 'matches'), where('teamUs', 'array-contains', linkedPlayerId)),
        snap => {
          const linked = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
          linkedMatchesRef.current = mergeMatches(linked, linkedMatchesRef.current);
          setMatches(mergeMatches(ownMatchesRef.current, linkedMatchesRef.current));
        },
        () => {} // silencioso
      );

      // Partidos donde el jugador vinculado está en teamThem
      unsubLinkedThem = onSnapshot(
        query(collection(db, 'matches'), where('teamThem', 'array-contains', linkedPlayerId)),
        snap => {
          const linked = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
          linkedMatchesRef.current = mergeMatches(linked, linkedMatchesRef.current);
          setMatches(mergeMatches(ownMatchesRef.current, linkedMatchesRef.current));
        },
        () => {} // silencioso
      );
    }

    return () => {
      unsubPlayers();
      unsubOwnMatches();
      unsubLinkedUs?.();
      unsubLinkedThem?.();
    };
  }, [linkedPlayerId]);

  return { players, matches, loading, linkedPlayerId };
}
