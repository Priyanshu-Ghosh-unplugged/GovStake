'use client';

import { useState, useEffect } from 'react';

// Dynamic: any agent ID can appear (Arena agents use real IDs)
type Balances = Record<string, number>;

type Escrow = {
  id: string;
  buyerId: string;
  workerId: string;
  bounty: number;
  stake: number;
  grantId: string;
  status: 'active' | 'completed' | 'slashed' | 'escalated';
};

export default function Home() {
  const [balances, setBalances] = useState<Balances>({});
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [resBal, resEsc, resAud] = await Promise.all([
        fetch('/api/ledger/balances'),
        fetch('/api/ledger/escrows'),
        fetch('/api/audit/logs')
      ]);
      
      if (resBal.ok) setBalances(await resBal.json());
      if (resEsc.ok) setEscrows(await resEsc.json());
      if (resAud.ok) setAuditLogs(await resAud.json());
    } catch (e) {
      console.error("Backend not running yet", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleInitialize = async () => {
    setLoadingAction('initialize');
    try {
      const response = await fetch('/api/escrow/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: 'agent_a_id',
          workerId: 'agent_b_id',
          bounty: 5,
          stake: 3,
          allowedCapabilities: [{
            resource: { namespace: "files", path: ["Work"] },
            actions: ["search"],
            scope: "descendants"
          }]
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        alert(`Initialization failed: ${errData.error || response.statusText}`);
      }

      await fetchData();
    } catch (e) {
      console.error(e);
    }
    setLoadingAction(null);
  };

  const handleExecute = async (escrowId: string, grantId: string) => {
    setLoadingAction('execute_' + escrowId);
    try {
      const response = await fetch('/api/escrow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: 'agent_a_id',
          workerId: 'agent_b_id',
          escrowGrantId: grantId
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        alert(`Execution failed: ${errData.error || response.statusText}`);
      }

      await fetchData();
    } catch (e) {
      console.error(e);
    }
    setLoadingAction(null);
  };

  const handleViolation = async (escrowId: string, grantId: string) => {
    setLoadingAction('violation_' + escrowId);
    try {
      // Use agent/message intent to force a violation + slash
      const response = await fetch('/api/agent/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'execute_escrow',
          buyerId: 'agent_a_id',
          workerId: 'agent_b_id',
          escrowGrantId: grantId,
          _forceViolation: true
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        alert(`Violation simulation failed: ${errData.error || response.statusText}`);
      }

      await fetchData();
    } catch (e) {
      console.error(e);
    }
    setLoadingAction(null);
  };

  // Calculate TVL
  const totalLocked = escrows
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + e.bounty + e.stake, 0);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 bg-brutal-grid pointer-events-none z-0"></div>
      
      {/* Brutalist Header */}
      <header className="fixed top-0 w-full z-50 border-b-4 border-indigo-500/30 bg-slate-900/80 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-none overflow-hidden border-2 border-indigo-500 flex-shrink-0">
              <img src="/icon.jpg" alt="GovStake Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tighter uppercase text-indigo-100">GovStake Casino & Kernel</span>
          </div>
          <div className="flex items-center space-x-4 text-sm font-mono font-bold uppercase tracking-widest">
            <div className="flex items-center space-x-2 text-emerald-400">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 bg-emerald-400"></span>
              </span>
              <span>Live Connection</span>
            </div>
            <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border-2 border-indigo-500/50">
              0% Error Rate
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-6 max-w-full mx-auto relative z-10 flex flex-col xl:flex-row gap-8">
        
        {/* Left Column: TVL & Active Escrows */}
        <div className="flex-1 space-y-12">
          {/* Hero TVL Section */}
          <div className="border-4 border-indigo-500/30 bg-slate-900/50 p-8 shadow-[8px_8px_0px_#4338CA]">
            <h1 className="text-2xl font-bold uppercase tracking-widest mb-2 border-b-2 border-indigo-500/30 pb-2 text-indigo-200">
              Casino Treasury (TVL)
            </h1>
            <div className="text-[clamp(4rem,10vw,10rem)] font-bold font-mono leading-none tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] break-all">
              {totalLocked} <span className="text-4xl text-slate-500">AC</span>
            </div>
            <p className="text-slate-400 mt-4 font-mono uppercase tracking-widest max-w-xl text-sm leading-relaxed">
              Trustless Escrow • Deterministic Slashing • Native SharedOS Integration
            </p>
            
            <div className="mt-8 flex gap-4">
              <button 
                onClick={handleInitialize}
                disabled={loadingAction === 'initialize'}
                className="px-6 py-3 bg-transparent border-4 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors font-bold uppercase tracking-widest disabled:opacity-50"
              >
                Create Test Escrow
              </button>
              <button 
                onClick={() => alert("To play the jackpot, send: { intent: 'play_jackpot', amount: 5 } to the agent!")}
                className="px-6 py-3 bg-amber-500 text-slate-900 border-4 border-amber-500 hover:bg-transparent hover:text-amber-400 transition-colors font-bold uppercase tracking-widest"
              >
                🎰 Spin Jackpot!
              </button>
              {escrows.length > 0 && escrows[escrows.length - 1].status === 'active' && (
                <>
                  <button 
                    onClick={() => handleExecute(escrows[escrows.length - 1].id, escrows[escrows.length - 1].grantId)}
                    disabled={!!loadingAction}
                    className="px-6 py-3 bg-emerald-500 text-slate-900 border-4 border-emerald-500 hover:bg-transparent hover:text-emerald-400 transition-colors font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {loadingAction?.startsWith('execute') ? '⏳ Running...' : 'Simulate Execution'}
                  </button>
                  <button 
                    onClick={() => handleViolation(escrows[escrows.length - 1].id, escrows[escrows.length - 1].grantId)}
                    disabled={!!loadingAction}
                    className="px-6 py-3 bg-rose-600 text-white border-4 border-rose-600 hover:bg-transparent hover:text-rose-400 transition-colors font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    {loadingAction?.startsWith('violation') ? '⏳ Slashing...' : '⚡ Force Violation'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Active Executions */}
          <div>
            <h2 className="text-3xl font-bold uppercase tracking-tighter mb-6 flex items-center border-b-4 border-indigo-500/30 pb-2 text-indigo-100">
              <span className="w-4 h-4 bg-indigo-500 mr-3"></span>
              Active Escrow Contracts
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {escrows.length === 0 ? (
                <div className="col-span-full border-4 border-indigo-500/20 border-dashed p-12 text-center text-indigo-300/50 font-mono uppercase tracking-widest font-bold">
                  No active escrows detected
                </div>
              ) : (
                [...escrows].reverse().map((escrow) => (
                  <div key={escrow.id} className="border-4 border-indigo-500/30 bg-slate-900/50 p-6 relative group shadow-[6px_6px_0px_#4338CA]">
                    <div className="absolute top-4 right-4">
                      {escrow.status === 'active' && <span className="px-2 py-1 bg-amber-500 text-slate-900 font-bold font-mono text-xs uppercase">Active</span>}
                      {escrow.status === 'slashed' && <span className="px-2 py-1 bg-rose-600 text-white font-bold font-mono text-xs uppercase">Slashed</span>}
                      {escrow.status === 'completed' && <span className="px-2 py-1 bg-emerald-500 text-slate-900 font-bold font-mono text-xs uppercase">Complete</span>}
                      {escrow.status === 'escalated' && <span className="px-2 py-1 bg-purple-500 text-white font-bold font-mono text-xs uppercase">Escalated</span>}
                    </div>
                    
                    <div className="space-y-3 font-mono text-sm mt-4">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="text-slate-400 uppercase">ID</span>
                        <span className="font-bold truncate max-w-[150px] text-slate-200">{escrow.id}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="text-slate-400 uppercase">Buyer</span>
                        <span className="font-bold truncate max-w-[150px] text-emerald-400">{escrow.buyerId}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="text-slate-400 uppercase">Worker</span>
                        <span className="font-bold truncate max-w-[150px] text-emerald-400">{escrow.workerId}</span>
                      </div>
                      
                      <div className="pt-2 flex justify-between font-bold text-lg text-slate-200">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase">Bounty</span>
                          <span>{escrow.bounty}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs text-slate-400 uppercase">Stake</span>
                          <span className={escrow.status === 'slashed' ? 'text-rose-500 line-through' : ''}>{escrow.stake}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger & Logs */}
        <div className="w-full xl:w-[450px] flex flex-col gap-8">
          
          {/* Agent Ledger */}
          <div className="border-4 border-indigo-500/30 bg-slate-900/50 shadow-[8px_8px_0px_#4338CA]">
            <h2 className="text-xl font-bold uppercase tracking-widest p-4 border-b-4 border-indigo-500/30 bg-indigo-500/20 text-indigo-200 flex items-center justify-between">
              <span>Casino High Rollers</span>
              <span className="font-mono text-sm text-indigo-300">STATE: SYNCED</span>
            </h2>
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto font-mono text-sm">
              {Object.keys(balances).length === 0 ? (
                <div className="text-indigo-300/50 text-center py-4">WAITING FOR AGENTS TO JOIN...</div>
              ) : (
                Object.entries(balances)
                  .sort((a, b) => b[1] - a[1]) // Sort by richest
                  .map(([agentId, balance]) => (
                  <div key={agentId} className="flex justify-between items-center p-3 border-2 border-indigo-500/20 hover:border-indigo-400 hover:bg-indigo-500/10 transition-colors">
                    <span className="truncate max-w-[200px] font-bold text-slate-200">{agentId}</span>
                    <span className="text-emerald-400 font-bold">{balance} AC</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="border-4 border-indigo-500/30 bg-slate-900/50 shadow-[8px_8px_0px_#4338CA] flex-1 flex flex-col min-h-[400px]">
            <h2 className="text-xl font-bold uppercase tracking-widest p-4 border-b-4 border-indigo-500/30 text-indigo-200 flex items-center justify-between">
              <span>Kernel Audit Stream</span>
              <span className="w-3 h-3 bg-rose-500 rounded-none animate-pulse"></span>
            </h2>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs flex flex-col gap-2">
              {auditLogs.length === 0 ? (
                <div className="text-indigo-300/50 text-center py-4">WAITING FOR KERNEL EVENTS...</div>
              ) : (
                auditLogs.map((log, index) => {
                  const isDenied = log.type === 'tool.denied' || log.outcome === 'denied' || log.type?.includes('denied');
                  const bgColor = isDenied ? 'bg-rose-950/40 border-rose-500/50' : 'bg-slate-800/50 border-slate-700';
                  const textColor = isDenied ? 'text-rose-400' : 'text-emerald-400';
                  
                  return (
                    <div 
                      key={log.id || index} 
                      className={`p-3 border-l-4 border-t border-r border-b relative group ${bgColor} transition-all`}
                      style={{ 
                        animation: 'fade-in 0.3s ease-out forwards',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 opacity-80">
                        <span className="text-slate-500">{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                        <span className={`font-bold uppercase ${textColor}`}>{log.type}</span>
                      </div>
                      <div className="break-all font-bold opacity-90 text-slate-200">
                        {log.tool || log.action || log.id?.substring(0,12) || 'UNKNOWN_EVENT'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
