'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../../firebase/firebaseConfig';
import { useRouter } from 'next/navigation';

export default function UserInfo() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <span>Olá, {user.displayName || user.email}!</span>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}