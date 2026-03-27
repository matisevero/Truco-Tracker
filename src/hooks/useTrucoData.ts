import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';

export interface Player {
  id: string;
  name: string;
  createdBy: string;
  createdAt: any;
  email?: string;
  phone?: string;
  photoUrl?: string;
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
  scoreUs: number;
  scoreThem: number;
  status: 'in-progress' | 'completed';
  createdBy: string;
  pointHistory?: PointEvent[];
}

export function useTrucoData() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const playersRef = collection(db, 'players');
    const qPlayers = query(playersRef, where('createdBy', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));

    const unsubscribePlayers = onSnapshot(qPlayers, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(playersData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'players'));

    const matchesRef = collection(db, 'matches');
    const qMatches = query(matchesRef, where('createdBy', '==', auth.currentUser.uid), orderBy('date', 'desc'));

    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(matchesData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));

    return () => {
      unsubscribePlayers();
      unsubscribeMatches();
    };
  }, []);

  return { players, matches, loading };
}
