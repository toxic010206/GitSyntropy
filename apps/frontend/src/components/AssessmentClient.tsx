import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { $assessment, $session } from "@/lib/stores";
import { AUTH_BYPASS_USER_ID, AUTH_REQUIRED } from "@/lib/featureFlags";

export function AssessmentClient() {
  const session = $session.get();
  const userId = session?.userId ?? AUTH_BYPASS_USER_ID;
  if (AUTH_REQUIRED && !session) {
    return (
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-12 w-full max-w-3xl mx-auto">
        <section className="glass-panel p-8 rounded-none w-full text-center">
          <h3 className="text-xl font-bold font-display text-white">Authentication Required</h3>
          <p className="text-gray-400 mt-2 mb-6">Sign in on the auth page to complete the assessment.</p>
          <a href="/auth" className="btn btn-primary justify-center">Go to Sign In</a>
        </section>
      </main>
    );
  }

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedUserId, setSubmittedUserId] = useState("");
  const [questions, setQuestions] = useState<
    { id: string; prompt: string; left_label: string; right_label: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [questionData, profileData] = await Promise.all([
          api.assessmentQuestions(),
          api.assessmentResponse(userId)
        ]);
        setQuestions(questionData);
        const restoredAnswers: Record<string, number> = {};
        const scoreDimensions = Object.keys(profileData.scores);
        scoreDimensions.forEach((dimension, idx) => {
          const questionId = `q${idx + 1}`;
          if (profileData.missing_question_ids.includes(questionId)) {
            return;
          }
          const maxWeight = idx + 1;
          const normalized = maxWeight === 0 ? 0 : profileData.scores[dimension] / maxWeight;
          restoredAnswers[questionId] = Math.max(1, Math.min(5, Math.round(normalized * 5)));
        });
        setAnswers(restoredAnswers);
        $assessment.set({
          userId: profileData.user_id,
          scores: profileData.scores,
          answeredCount: profileData.answered_count,
          totalQuestions: profileData.total_questions,
          missingQuestionIds: profileData.missing_question_ids,
          complete: profileData.complete,
          submittedAt: profileData.submitted_at
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      const data = await api.submitAssessment(userId, answers);
      setSubmittedUserId(data.user_id);
      $assessment.set({
        userId: data.user_id,
        scores: data.scores,
        answeredCount: data.answered_count,
        totalQuestions: data.total_questions,
        missingQuestionIds: data.missing_question_ids,
        complete: data.complete,
        submittedAt: data.submitted_at
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = questions.length || 8;
  const answeredCount = Object.keys(answers).length;
  const progress = useMemo(() => Math.round((answeredCount / totalCount) * 100), [answeredCount, totalCount]);
  const activeQuestion = questions[currentIndex];
  const hasAllAnswers = answeredCount === totalCount;

  const selectAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const nextQuestion = () => {
    setCurrentIndex((idx) => Math.min(idx + 1, totalCount - 1));
  };

  const prevQuestion = () => {
    setCurrentIndex((idx) => Math.max(idx - 1, 0));
  };

  return (
    <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-12 w-full max-w-3xl mx-auto">
      {/* Header & Progress */}
      <div className="w-full mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-1">Weekly Pulse Sync</h1>
            <p className="text-gray-400 text-sm">Calibrating your psychometric baseline</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-display text-accent-neon">{progress}%</span>
            <span className="text-gray-500 text-sm block">Complete</span>
          </div>
        </div>
        
        {/* Progress Bar Container */}
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent-neon rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
          <span>START</span>
          <span>SYNC COMPLETE</span>
        </div>
      </div>

      {loading && <p className="text-white">Loading assessment profile...</p>}
      {error && <p className="text-red-400">Unable to load assessment data. Refresh and try again.</p>}

      {activeQuestion && (
        <div className="w-full glass-panel rounded-none p-8 md:p-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-white/10 text-6xl transform rotate-12 group-hover:text-primary/20 transition-colors duration-500">
              psychology
            </span>
          </div>

          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/40 text-xs font-bold tracking-widest text-primary mb-6 font-display uppercase">
              Question {currentIndex + 1} of {totalCount}
            </span>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 font-display leading-tight">
              {activeQuestion.prompt}
            </h2>

            {/* Custom Range Slider Wrapper */}
            <div className="relative w-full px-4 mb-10">
              <input 
                type="range" 
                min="1" 
                max="5" 
                step="1"
                value={answers[activeQuestion.id] ?? 3}
                onChange={(e) => selectAnswer(activeQuestion.id, Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary accent-primary"
                style={{
                  accentColor: "var(--primary-solid)",
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, var(--primary-solid) ${((answers[activeQuestion.id] ?? 3) - 1) * 25}%, rgba(255,255,255,0.1) ${((answers[activeQuestion.id] ?? 3) - 1) * 25}%)`
                }}
              />
              <div className="flex justify-between mt-6">
                <span className="text-sm font-medium text-gray-400 w-1/3 text-left leading-tight">{activeQuestion.left_label}</span>
                <span className="text-xs font-mono text-primary/50 w-1/3 text-center pt-1">{answers[activeQuestion.id] ?? 3}</span>
                <span className="text-sm font-medium text-gray-400 w-1/3 text-right leading-tight">{activeQuestion.right_label}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="w-full flex justify-between items-center mt-8">
        <button 
          onClick={prevQuestion} 
          disabled={currentIndex === 0}
          className="px-6 py-3 rounded-full border border-white/40 bg-transparent text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </button>

        {currentIndex < totalCount - 1 ? (
          <button 
            onClick={nextQuestion}
            className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            Next
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        ) : (
          <button 
            onClick={submitAssessment}
            disabled={!hasAllAnswers || submitting}
            className="px-8 py-3 rounded-full bg-primary hover:bg-[#aacc00] text-black font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Syncing..." : "Complete Sync"}
            {!submitting && <span className="material-symbols-outlined text-sm">check_circle</span>}
          </button>
        )}
      </div>

      {submittedUserId && (
        <div className="mt-8 p-4 bg-accent-neon/10 border border-accent-neon/30 rounded-none text-accent-neon text-center animate-pulse-slow">
          <p className="font-bold flex justify-center items-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            Assessment saved for {submittedUserId}. Readiness: {hasAllAnswers ? "Ready" : "Incomplete"}.
          </p>
        </div>
      )}
    </main>
  );
}