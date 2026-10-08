import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
export default function Chat() {
  const { socket, online, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const bottom = useRef(null);
  useEffect(() => {
    if (!socket) return;
    let active = true;
    const merge = incoming => setMessages(previous => [...new Map([...previous, ...incoming].map(m => [m._id, m])).values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-100));
    const sync = () => {
      setConnected(socket.connected);
      api('/chat/messages').then(data => { if (active) { merge(data); setError(''); } }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    };
    const receive = message => merge([message]);
    const disconnect = () => setConnected(false);
    const failure = error => { setConnected(false); setError(error.message); };
    socket.on('message', receive); socket.on('connect', sync); socket.on('disconnect', disconnect); socket.on('connect_error', failure);
    sync();
    return () => { active = false; socket.off('message', receive); socket.off('connect', sync); socket.off('disconnect', disconnect); socket.off('connect_error', failure); };
  }, [socket, revision]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);
  function send(event) {
    event.preventDefault(); if (!content.trim() || !connected) return;
    setSending(true); setError('');
    socket.timeout(10000).emit('sendMessage', { content }, (timeout, response) => {
      setSending(false);
      if (timeout || response?.error) setError(response?.error || 'Delivery was not confirmed. Check the conversation before retrying.');
      else setContent('');
    });
  }
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Team chat</h1><p className="text-slate-500">Shared with all approved members · {connected ? 'Connected' : 'Reconnecting…'}</p><div className="grid gap-6 lg:grid-cols-[1fr_240px]"><section className="panel flex flex-col min-w-0"><div aria-live="polite" role="log" className="h-[50vh] overflow-y-auto space-y-4 mb-4">{loading && <p>Loading messages…</p>}{!loading && !messages.length && <p className="text-slate-500">No messages yet. Start a conversation.</p>}{messages.map(message => <div key={message._id} className={`rounded-lg p-3 max-w-[90%] break-words ${message.sender?._id === user._id ? 'ml-auto bg-blue-50 text-slate-900' : 'bg-slate-100 text-slate-900'}`}><div className="text-xs text-slate-500 mb-1">{message.sender?.fullName || 'Former member'} · {new Date(message.createdAt).toLocaleString()}</div><p className="whitespace-pre-wrap">{message.content}</p></div>)}<div ref={bottom} /></div>{error && <p role="alert" className="error mb-3">{error} <button className="underline" onClick={() => setRevision(r => r + 1)}>Refresh history</button></p>}<form onSubmit={send} className="flex gap-3"><input aria-label="Message" className="field" placeholder="Write to your team…" maxLength={2000} value={content} onChange={e => setContent(e.target.value)} /><button className="btn" disabled={!connected || sending || !content.trim()}>{sending ? 'Sending…' : 'Send'}</button></form></section><aside className="panel"><h2 className="font-semibold mb-4">Online · {online.length}</h2><ul className="space-y-3">{online.map(person => <li key={person._id}><span className="text-green-500">●</span> {person.fullName}</li>)}</ul></aside></div></div>;
}
