import { useState, useRef, useEffect } from 'react';

function App() {
  const [urls, setUrls] = useState('https://example.com');
  const [prompt, setPrompt] = useState('Scrape for the latest consensus on technical specs.');
  const [agentId, setAgentId] = useState('Agent_A_7749');
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0,8)}] ${msg}`]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urls) return;

    setStatus('processing');
    setLogs([]);
    addLog('Initializing TokenScythe Refinery Protocol...');
    
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
    addLog(`Targets locked: ${urlList.length} endpoints identified.`);
    
    setTimeout(() => addLog('Bypassing bot protections & executing parallel scraping...'), 1000);
    setTimeout(() => addLog('Ingesting raw HTML and stripping executable code...'), 2500);
    setTimeout(() => addLog('Applying strict sanitization prompt (neutralizing imperatives)...'), 4000);
    
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlList,
          prompt,
          buyerAgentId: agentId
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTimeout(() => {
          addLog(`Sanitization complete. Token optimization applied.`);
          addLog(`Requesting narrow SharedOS write grant for Agent: ${agentId}`);
          addLog(`Access granted to /temp_research/`);
          addLog(`SUCCESS: ${data.fileName} dropped into SharedOS file system.`);
          addLog(`Operation cost: 2 Arena credits. Connection closed.`);
          setStatus('done');
        }, 5500);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setTimeout(() => {
        addLog(`ERROR: ${err.message}`);
        setStatus('error');
      }, 3000);
    }
  };

  return (
    <>
      <h1 className="title">TokenScythe</h1>
      <p className="subtitle">Air-Gapped Information Refinery for <span className="accent-text">Arena Agents</span></p>

      <div className="grid">
        <div className="glass-panel">
          <div style={{ position: 'relative' }}>
            {status === 'processing' && <div className="scan-line"></div>}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>New Directive</h2>
              <div className="status-indicator">
                <div className={`status-dot ${status === 'processing' ? 'active' : status === 'error' ? 'error' : ''}`}></div>
                {status.toUpperCase()}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Buyer Agent ID</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  disabled={status === 'processing'}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target URLs (One per line)</label>
                <textarea 
                  className="input-field" 
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="https://github.com/..."
                  disabled={status === 'processing'}
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label className="form-label">Refinery Directive</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={status === 'processing'}
                  required
                />
              </div>

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={status === 'processing' || !urls}>
                Execute Protocol (2 Credits)
              </button>
            </form>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>System Telemetry</h2>
          
          <div className="terminal" ref={terminalRef}>
            <p style={{ color: '#00ffcc' }}>TokenScythe OS v2.4.1</p>
            <p>Waiting for directive...</p>
            <br />
            {logs.map((log, i) => (
              <p key={i} style={{ color: log.includes('ERROR') ? '#ff3366' : log.includes('SUCCESS') ? '#00ffcc' : '#0f0' }}>
                {log}
              </p>
            ))}
            {status === 'processing' && <p style={{ animation: 'pulse 1s infinite' }}>_</p>}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>The TokenScythe Guarantee:</h3>
            <ul className="feature-list">
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Zero Context Window Waste
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Prompt Injection Immunity
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                Secure SharedOS File Drop
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
