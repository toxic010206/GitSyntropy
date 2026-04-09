import { useEffect, useMemo, useState } from "react";

import { api, type OrchestratorStreamEvent, wsUrlForRun } from "@/lib/api";
import { $session } from "@/lib/stores";
import { AUTH_BYPASS_USER_ID, AUTH_REQUIRED } from "@/lib/featureFlags";

type StreamConnection = "idle" | "connecting" | "streaming" | "done" | "error";

export function WorkspaceClient() {
  const session = $session.get();
  const userId = session?.userId ?? AUTH_BYPASS_USER_ID;
  if (AUTH_REQUIRED && !session) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <section className="glass-panel p-8 rounded-none w-full max-w-md text-center">
          <h3 className="text-xl font-bold font-display text-white">Authentication Required</h3>
          <p className="text-gray-400 mt-2 mb-6">Sign in on the auth page to run orchestrated analysis.</p>
          <a href="/auth" className="btn btn-primary justify-center">Go to Sign In</a>
        </section>
      </main>
    );
  }

  const [events, setEvents] = useState<OrchestratorStreamEvent[]>([]);
  const [currentRun, setCurrentRun] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [connection, setConnection] = useState<StreamConnection>("idle");
  const [startingRun, setStartingRun] = useState(false);

  useEffect(() => {
    if (!currentRun) return;
    setConnection("connecting");
    const ws = new WebSocket(wsUrlForRun(currentRun));
    let closedByClient = false;

    ws.onopen = () => setConnection("streaming");
    ws.onmessage = (evt) => {
      const payload = JSON.parse(evt.data) as OrchestratorStreamEvent;
      setEvents((prev) => [...prev, payload]);
      if (payload.status === "error") {
        setConnection("error");
      } else if (payload.step === "orchestration" && payload.status === "completed") {
        setConnection("done");
      }
    };
    ws.onerror = () => {
      setConnection("error");
      setRunError("WebSocket stream failed while receiving orchestrator updates.");
    };
    ws.onclose = () => {
      if (closedByClient) return;
      setConnection((state) => (state === "done" ? "done" : "error"));
    };
    return () => {
      closedByClient = true;
      ws.close();
    };
  }, [currentRun]);

  const latestProgress = useMemo(() => events.at(-1)?.progress_pct ?? 0, [events]);
  const runOrchestrator = async () => {
    setStartingRun(true);
    setRunError(null);
    setConnection("idle");
    setEvents([]);
    setCurrentRun(null);
    try {
      const data = await api.orchestratorRun("team_alpha", userId, true);
      setCurrentRun(data.run_id);
    } catch {
      setRunError("Could not start orchestrator run.");
      setConnection("error");
    } finally {
      setStartingRun(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-40 pb-24 flex flex-col min-h-screen relative z-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 font-display">
            Workspace
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-accent-neon"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-neon"></span>
            </span>
            <p className="text-gray-400 text-sm font-medium">Team Simulator v2.4</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden glass-card rounded-2xl border border-white/10 min-h-[600px] mb-10 shadow-2xl">
        {/* Left Sidebar - Agent Config */}
        <aside className="w-80 border-r border-white/10 bg-white/5 flex flex-col z-10 overflow-y-auto backdrop-blur-md">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 font-display">Simulation Config</h2>
              <span className="material-symbols-outlined text-gray-500 text-sm">tune</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block font-mono">TARGET TEAM</label>
                <select className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                  <option>Core Platform (team_alpha)</option>
                  <option>Growth Squad (team_beta)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 font-display">Talent Inventory</h2>
            
            <div className="space-y-3">
              {/* Member Item */}
              <div className="glass-panel p-3 rounded-xl border-l-4 border-l-primary flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-xs font-bold text-white shadow-neon">
                    AL
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">Alice L.</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono">Backend Lead</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500 group-hover:text-white text-sm">drag_indicator</span>
              </div>
              
              {/* Member Item */}
              <div className="glass-panel p-3 rounded-xl border-l-4 border-l-accent-teal flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-teal to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow-neon-green">
                    BO
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">Bob O.</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono">Frontend Dev</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-500 group-hover:text-white text-sm">drag_indicator</span>
              </div>
            </div>

            <button className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/40 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">person_add</span>
              ADD CANDIDATE
            </button>
          </div>
          
          <div className="p-6 border-t border-white/10 bg-black/20">
              <button 
                className="w-full btn btn-primary py-3.5 shadow-neon rounded-xl flex items-center justify-center gap-2"
                onClick={runOrchestrator}
                disabled={startingRun || connection === "connecting" || connection === "streaming"}
              >
                <span className="material-symbols-outlined">play_arrow</span>
                {startingRun ? "Starting..." : connection === "streaming" ? "Running..." : "Run Simulation"}
              </button>
          </div>
        </aside>

        {/* Main Simulator Canvas */}
        <main className="flex-1 bg-black/40 relative flex flex-col overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>
          
          <div className="flex-1 overflow-y-auto p-8 md:p-12 pb-32 z-10">
            {!currentRun && events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                  <span className="material-symbols-outlined text-5xl text-gray-400">schema</span>
                </div>
                <h3 className="text-2xl font-bold font-display text-white">Simulator Idle</h3>
                <p className="text-sm text-gray-400 mt-3 max-w-sm">Configure your team on the left and run the simulation to see real-time orchestrator analysis.</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                {/* Pipeline Progress Header */}
                <div className="glass-panel p-6 rounded-2xl mb-4 border-white/10 sticky top-0 z-20 bg-[#121215]/80 backdrop-blur-xl shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold font-display text-white flex items-center gap-2">
                      <span className={`material-symbols-outlined ${connection === 'streaming' ? 'text-primary animate-spin-slow' : 'text-accent-neon'}`}>
                        {connection === 'streaming' ? 'sync' : 'task_alt'}
                      </span>
                      {connection === "streaming" ? "Analysis in Progress..." : "Analysis Complete"}
                    </h3>
                    <span className="text-2xl font-bold font-mono text-primary">{latestProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent-teal transition-all duration-300"
                      style={{ width: `${latestProgress}%` }}
                    ></div>
                  </div>
                </div>

                {runError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {runError}
                  </div>
                )}

                {/* Event Stream Log */}
                {events.map((event, idx) => {
                  const isError = event.status === "error";
                  const isCompleted = event.status === "completed";
                  const isRunning = event.status === "running";
                  
                  let icon = "pending";
                  let colorClass = "text-gray-400 border-white/5 bg-white/5";
                  
                  if (isCompleted) {
                    icon = "check_circle";
                    colorClass = "text-accent-neon border-accent-neon/30 bg-accent-neon/5";
                  } else if (isError) {
                    icon = "error";
                    colorClass = "text-red-400 border-red-500/30 bg-red-500/5";
                  } else if (isRunning) {
                    icon = "sync";
                    colorClass = "text-primary border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(204,255,0,0.2)]";
                  }

                  return (
                    <div key={`${event.step}-${idx}`} className={`p-5 rounded-2xl border ${colorClass} transition-all duration-500 flex items-start gap-4`}>
                      <span className={`material-symbols-outlined mt-0.5 ${isRunning ? 'animate-spin-slow' : ''}`}>
                        {icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold uppercase tracking-wider text-sm font-display">{event.step.replace(/_/g, ' ')}</h4>
                          <span className="text-xs font-mono opacity-60 bg-black/20 px-2 py-0.5 rounded">{event.progress_pct}%</span>
                        </div>
                        {event.message && <p className="text-sm opacity-80 mt-2">{event.message}</p>}
                      </div>
                    </div>
                  );
                })}
                
                {connection === "done" && (
                  <div className="mt-8 flex justify-center animate-pulse-slow">
                    <a href="/insights" className="btn btn-primary px-8 py-3 rounded-xl shadow-neon flex items-center gap-2">
                      View Full Synthesis
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}