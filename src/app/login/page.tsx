'use client';

import React, { useState } from 'react';
//import { auth, analytics } from '../../../firebase/firebaseConfig';
import { auth } from '../../../firebase/firebaseConfig';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push('/'); // Redireciona para a página principal após login
    } catch (error: any) {
      setErro(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    setErro('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error: any) {
      setErro(error.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 32 }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8, padding: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 8 }}>Entrar</button>
      </form>
      <button onClick={handleGoogleLogin} style={{ width: '100%', marginTop: 16, padding: 8 }}>
        Entrar com Google
      </button>
      {erro && <p style={{ color: 'red', marginTop: 16 }}>{erro}</p>}
    </div>
  );
}