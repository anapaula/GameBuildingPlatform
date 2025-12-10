'use client';

import { useState } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSend = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim()) return;

  // Adiciona mensagem do usuário
  setMessages((msgs) => [...msgs, { sender: 'user', text: input }]);
  const userMessage = input;
  setInput('');

  // Chama a API do backend
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMessage }),
    });
    const data = await res.json();
    setMessages((msgs) => [
      ...msgs,
      { sender: 'bot', text: data.answer }
    ]);
  } catch (err) {
    setMessages((msgs) => [
      ...msgs,
      { sender: 'bot', text: 'Erro ao buscar resposta. Tente novamente.' }
    ]);
  }
};

//   Versão apenas com simulação de resposta
//    const handleSend = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim()) return;

//     // Adiciona mensagem do usuário
//     setMessages((msgs) => [...msgs, { sender: 'user', text: input }]);

//     // Aqui será feita a chamada para a IA no futuro
//     // Por enquanto, resposta simulada
//     setMessages((msgs) => [
//       ...msgs,
//       { sender: 'user', text: input },
//       { sender: 'bot', text: 'Em breve, resposta inteligente aqui!' },
//     ]);
//     setInput('');
//   };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, maxWidth: 500, margin: 'auto' }}>
      <div style={{ minHeight: 200, marginBottom: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '8px 0' }}>
            <b>{msg.sender === 'user' ? 'Você' : 'Bot'}:</b> {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>Enviar</button>
      </form>
    </div>
  );
}