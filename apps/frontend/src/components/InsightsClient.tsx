import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { $session } from "@/lib/stores";
import { AUTH_REQUIRED } from "@/lib/featureFlags";

export function InsightsClient() {
  const session = $session.get();
  if (AUTH_REQUIRED && !session) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-12 w-full max-w-3xl mx-auto">
        <section className="glass-panel p-8 rounded-none w-full text-center">
          <h3 className="text-xl font-bold font-display text-white">Authentication Required</h3>
          <p className="text-gray-400 mt-2 mb-6">Sign in on the auth page to view synthesis insights.</p>
          <a href="/auth" className="btn btn-primary justify-center">Go to Sign In</a>
        </section>
      </main>
    );
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<{
    narrative: string;
    recommendations: string[];
    uncertainty_note: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await api.synthesis();
        setData(result);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <main className="relative z-10 w-full max-w-[1200px] mx-auto px-4 md:px-8 pt-40 pb-20 flex flex-col min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <span className="text-accent-info font-mono text-xs uppercase tracking-widest mb-2 block flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            AI Synthesis
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-white mb-2">
            Executive Summary
          </h1>
          <p className="text-gray-400 max-w-xl">
            Holistic insights combining GitHub metrics, chronotype alignment, and psychometric assessments.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-32 opacity-60">
          <span className="material-symbols-outlined text-6xl text-primary animate-spin-slow mb-6">
            sync
          </span>
          <h3 className="text-2xl font-bold font-display text-white mb-2">Generating Synthesis</h3>
          <p className="text-gray-400">Claude is analyzing your team's synchronization patterns...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-none text-red-400 text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl">error</span>
          <div>
            <h3 className="font-bold mb-1">Synthesis Generation Failed</h3>
            <p className="text-sm opacity-80">Unable to retrieve AI insights. Please check the backend connection and try again.</p>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Narrative Card */}
          <div className="lg:col-span-8 glass-card rounded-none p-8 md:p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-accent-info/5 to-transparent rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            
            <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-3 relative z-10">
              <span className="w-8 h-8 rounded-full bg-accent-info/20 flex items-center justify-center text-accent-info">
                <span className="material-symbols-outlined text-[18px]">psychiatry</span>
              </span>
              Team Dynamics Narrative
            </h2>
            
            <div className="relative z-10">
              <span className="material-symbols-outlined text-6xl text-white/5 absolute -top-4 -left-4">format_quote</span>
              <p className="text-lg text-gray-300 leading-relaxed relative z-10 pl-6 border-l-2 border-accent-info/30">
                {data.narrative}
              </p>
            </div>
            
            <div className="mt-12 pt-6 border-t border-white/40 relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500/60 text-[18px]">info</span>
                <p className="text-xs text-gray-500 font-mono tracking-wide">{data.uncertainty_note}</p>
              </div>
              <span className="px-3 py-1 rounded bg-white/5 border border-white/40 text-[10px] uppercase text-gray-400 font-bold tracking-widest">
                Confidence: High
              </span>
            </div>
          </div>

          {/* Recommendations Side Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6 relative z-10">
            <div className="glass-panel rounded-none p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold font-display text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-accent-neon text-[20px]">lightbulb</span>
                Key Recommendations
              </h3>
              
              <div className="flex-1 flex flex-col gap-4">
                {data.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/40 rounded-none p-4 flex gap-4 hover:bg-white/10 hover:border-primary/30 transition-all group">
                    <div className="w-6 h-6 rounded-full bg-black/50 border border-white/40 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 group-hover:text-primary group-hover:border-primary/50 transition-colors">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed flex-1">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Card */}
            <div className="glass-panel rounded-none p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <h4 className="font-bold text-white text-sm mb-2 font-display">Export Findings</h4>
              <p className="text-xs text-gray-400 mb-4">Share this synthesis report with your engineering leadership.</p>
              <button className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/40 rounded-lg text-sm font-bold text-white transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">ios_share</span>
                Share Report
              </button>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}