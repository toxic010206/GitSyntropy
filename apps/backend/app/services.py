from datetime import UTC, datetime, timedelta
import random
from functools import lru_cache
from typing import Any, AsyncIterator, TypedDict
from urllib.parse import urlencode
from uuid import uuid4

from jose import JWTError, jwt
from langgraph.graph import END, START, StateGraph

from .config import settings
from .schemas import ASHTAKOOT_DIMENSIONS, ASHTAKOOT_WEIGHTS


def create_jwt(user_id: str) -> tuple[str, int]:
    expires_in = settings.jwt_exp_minutes * 60
    expiry = datetime.now(tz=UTC) + timedelta(seconds=expires_in)
    token = jwt.encode(
        {"sub": user_id, "exp": expiry, "iss": settings.jwt_issuer},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, expires_in


class AuthTokenError(Exception):
    pass


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
        )
    except JWTError as exc:
        raise AuthTokenError("Invalid or expired token.") from exc


def create_oauth_state() -> str:
    return uuid4().hex


def build_github_authorization_url(state: str) -> str:
    scopes = settings.github_scope.split()
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_url,
        "scope": " ".join(scopes),
        "state": state,
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


def exchange_github_code_for_identity(code: str) -> str:
    clean = "".join(char for char in code.lower() if char.isalnum())
    if not clean:
        raise ValueError("OAuth code is invalid.")
    return f"user_github_{clean[-8:]}"


GITHUB_SYNC_COMPLETE_AFTER_SECONDS = 2.5
_github_sync_store: dict[str, dict[str, Any]] = {}
_assessment_responses: dict[str, dict[str, Any]] = {}


def _derive_chronotype(github_handle: str) -> str:
    if github_handle.lower().startswith("night"):
        return "owl"
    if github_handle.lower().startswith("early"):
        return "lark"
    return "balanced"


def _sync_snapshot(record: dict[str, Any]) -> dict[str, Any]:
    elapsed = (datetime.now(tz=UTC) - record["started_at"]).total_seconds()
    if elapsed < 0.75:
        status = "queued"
    elif elapsed < GITHUB_SYNC_COMPLETE_AFTER_SECONDS:
        status = "syncing"
    else:
        status = "complete"

    record["status"] = status
    record["updated_at"] = datetime.now(tz=UTC)
    if status == "complete" and record["completed_at"] is None:
        record["completed_at"] = datetime.now(tz=UTC)
    return record


def trigger_github_sync(github_handle: str, user_id: str) -> dict[str, Any]:
    chronotype = _derive_chronotype(github_handle)
    commits = len(github_handle) * 7
    prs = len(github_handle) * 3
    activity_rhythm_score = round(min(100.0, 20 + commits * 0.9), 2)
    sync_id = str(uuid4())
    record: dict[str, Any] = {
        "sync_id": sync_id,
        "user_id": user_id,
        "github_handle": github_handle,
        "chronotype": chronotype,
        "activity_rhythm_score": activity_rhythm_score,
        "collaboration_index": round(min(100, 45 + prs * 0.8), 2),
        "prs_last_30_days": prs,
        "commits_last_30_days": commits,
        "status": "queued",
        "started_at": datetime.now(tz=UTC),
        "updated_at": datetime.now(tz=UTC),
        "completed_at": None,
    }
    _github_sync_store[sync_id] = record
    return _sync_snapshot(record)


def get_github_sync(sync_id: str) -> dict[str, Any] | None:
    record = _github_sync_store.get(sync_id)
    if record is None:
        return None
    return _sync_snapshot(record)


def assessment_questions() -> list[dict]:
    prompts = [
        ("Decision style in uncertainty", "Intuitive", "Analytical"),
        ("Preferred delivery rhythm", "Steady", "Bursty"),
        ("Conflict handling pattern", "Direct", "Diplomatic"),
        ("Team interaction mode", "Independent", "Collaborative"),
        ("Context switching tolerance", "Low", "High"),
        ("Communication density", "Concise", "Detailed"),
        ("Experimentation appetite", "Conservative", "Exploratory"),
        ("Working-hour preference", "Early", "Late"),
    ]
    questions = []
    for index, (prompt, left, right) in enumerate(prompts):
        questions.append(
            {
                "id": f"q{index + 1}",
                "prompt": prompt,
                "left_label": left,
                "right_label": right,
                "dimension": ASHTAKOOT_DIMENSIONS[index],
            }
        )
    return questions


def score_assessment(answers: dict[str, int]) -> dict[str, float]:
    scored: dict[str, float] = {}
    for index, dimension in enumerate(ASHTAKOOT_DIMENSIONS):
        key = f"q{index + 1}"
        value = answers.get(key)
        if value is None:
            scored[dimension] = 0.0
            continue
        normalized = max(1, min(5, value)) / 5
        scored[dimension] = round(normalized * ASHTAKOOT_WEIGHTS[dimension], 2)
    return scored


def build_assessment_profile(user_id: str, answers: dict[str, int], submitted_at: datetime | None = None) -> dict:
    question_ids = [f"q{index + 1}" for index in range(len(ASHTAKOOT_DIMENSIONS))]
    missing_question_ids = [question_id for question_id in question_ids if question_id not in answers]
    return {
        "user_id": user_id,
        "scores": score_assessment(answers),
        "answered_count": len(answers),
        "total_questions": len(question_ids),
        "missing_question_ids": missing_question_ids,
        "complete": len(missing_question_ids) == 0,
        "submitted_at": submitted_at,
    }


def submit_assessment_response(user_id: str, answers: dict[str, int]) -> dict:
    submitted_at = datetime.now(tz=UTC)
    profile = build_assessment_profile(user_id=user_id, answers=answers, submitted_at=submitted_at)
    _assessment_responses[user_id] = profile
    return profile


def get_assessment_response(user_id: str) -> dict:
    if user_id in _assessment_responses:
        return _assessment_responses[user_id]
    return build_assessment_profile(user_id=user_id, answers={})


def mock_compatibility_scores(member_id: str, data_mode: str = "full") -> dict[str, float | None]:
    seed = sum(ord(ch) for ch in member_id.lower())
    rng = random.Random(seed)
    scores: dict[str, float | None] = {}

    for dimension in ASHTAKOOT_DIMENSIONS:
        weight = ASHTAKOOT_WEIGHTS[dimension]
        # Stable deterministic signal generation for local demo runs.
        scores[dimension] = round(weight * rng.uniform(0.35, 0.95), 2)

    if data_mode == "incomplete":
        for dimension in rng.sample(ASHTAKOOT_DIMENSIONS, k=3):
            scores[dimension] = None

    return scores


def compatibility(scores_a: dict[str, float | None], scores_b: dict[str, float | None]) -> dict:
    dim_scores: dict[str, float] = {}
    dim_breakdown: list[dict] = []
    weak: list[str] = []
    strong: list[str] = []
    risk_flags: list[str] = []
    data_gaps: set[str] = set()
    total = 0.0
    observed_signal_count = 0
    total_signal_count = len(ASHTAKOOT_DIMENSIONS) * 2

    for dimension in ASHTAKOOT_DIMENSIONS:
        max_dim = ASHTAKOOT_WEIGHTS[dimension]
        raw_a = scores_a.get(dimension)
        raw_b = scores_b.get(dimension)

        if raw_a is not None:
            observed_signal_count += 1
        if raw_b is not None:
            observed_signal_count += 1
        if raw_a is None or raw_b is None:
            data_gaps.add(dimension)

        a = raw_a if raw_a is not None else max_dim * 0.5
        b = raw_b if raw_b is not None else max_dim * 0.5
        similarity = max(0.0, 1.0 - (abs(a - b) / max_dim))
        dim_score = round(similarity * max_dim, 2)
        dim_scores[dimension] = dim_score
        total += dim_score
        pct_of_weight = round((dim_score / max_dim) * 100, 2)

        if dim_score < max_dim * 0.3:
            status = "weak"
            weak.append(dimension)
            risk_flags.append(f"Critical misalignment in {dimension.replace('_', ' ')}.")
        elif dim_score > max_dim * 0.8:
            status = "strong"
            strong.append(dimension)
        else:
            status = "balanced"

        dim_breakdown.append(
            {
                "dimension": dimension,
                "weight": max_dim,
                "score": dim_score,
                "pct_of_weight": pct_of_weight,
                "status": status,
            }
        )

    if total >= 28:
        level = "excellent"
        label = "excellent"
    elif total >= 20:
        level = "good"
        label = "moderate"
    elif total >= 12:
        level = "fair"
        label = "moderate"
    else:
        level = "poor"
        label = "high_friction"

    confidence = round(observed_signal_count / total_signal_count, 2)
    if confidence < 0.75:
        risk_flags.append("Low confidence: one or more dimensions have sparse data.")

    if dim_scores["nadi_chronotype_sync"] < ASHTAKOOT_WEIGHTS["nadi_chronotype_sync"] * 0.45:
        risk_flags.append("Chronotype sync is weak; consider async-first collaboration rituals.")

    return {
        "total_score_36": round(total, 2),
        "score_pct_100": round((total / 36) * 100, 2),
        "level": level,
        "label": label,
        "weak_dimensions": weak,
        "strong_dimensions": strong,
        "risk_flags": risk_flags,
        "confidence": confidence,
        "data_gaps": sorted(data_gaps),
        "dimension_scores": dim_scores,
        "dimension_breakdown": dim_breakdown,
    }


def start_orchestrator_steps(include_candidates: bool) -> list[str]:
    steps = ["github_analyst", "psychometric_profiler", "compatibility_engine", "synthesis"]
    if include_candidates:
        steps.insert(2, "candidate_simulation")
    return steps


class OrchestratorState(TypedDict, total=False):
    team_id: str
    user_id: str
    include_candidates: bool
    github_signals: dict[str, Any]
    assessment_profile: dict[str, Any]
    candidate_outlook: dict[str, Any]
    compatibility: dict[str, Any]
    synthesis: dict[str, Any]


def _github_analyst_node(state: OrchestratorState) -> dict[str, Any]:
    handle = state["user_id"].replace("user_", "") or "team-member"
    return {"github_signals": trigger_github_sync(github_handle=handle, user_id=state["user_id"])}


def _psychometric_profiler_node(_: OrchestratorState) -> dict[str, Any]:
    answer_map = {f"q{idx + 1}": 3 + (idx % 3) for idx in range(len(ASHTAKOOT_DIMENSIONS))}
    profile = build_assessment_profile(user_id="orchestrator_user", answers=answer_map, submitted_at=datetime.now(tz=UTC))
    return {"assessment_profile": profile}


def _candidate_simulation_node(_: OrchestratorState) -> dict[str, Any]:
    # Deterministic placeholder output until candidate simulation service lands.
    return {
        "candidate_outlook": {
            "status": "simulated",
            "recommended_match": "candidate_delta",
            "confidence": 0.71,
        }
    }


def _compatibility_engine_node(state: OrchestratorState) -> dict[str, Any]:
    source_scores = state["assessment_profile"]["scores"]
    reference_scores = {
        dimension: round(max(weight - 0.6, 0.4), 2) for dimension, weight in ASHTAKOOT_WEIGHTS.items()
    }
    return {"compatibility": compatibility(source_scores, reference_scores)}


def _synthesis_node(state: OrchestratorState) -> dict[str, Any]:
    compat = state["compatibility"]
    return {
        "synthesis": synthesis_from_compat(
            total_score=compat["total_score_36"],
            weak_dimensions=compat["weak_dimensions"],
        )
    }


def _route_after_psychometric(state: OrchestratorState) -> str:
    return "candidate_simulation" if state.get("include_candidates") else "compatibility_engine"


@lru_cache(maxsize=1)
def _compiled_orchestrator_graph():
    graph = StateGraph(OrchestratorState)
    graph.add_node("github_analyst", _github_analyst_node)
    graph.add_node("psychometric_profiler", _psychometric_profiler_node)
    graph.add_node("candidate_simulation", _candidate_simulation_node)
    graph.add_node("compatibility_engine", _compatibility_engine_node)
    graph.add_node("synthesis", _synthesis_node)

    graph.add_edge(START, "github_analyst")
    graph.add_edge("github_analyst", "psychometric_profiler")
    graph.add_conditional_edges(
        "psychometric_profiler",
        _route_after_psychometric,
        {
            "candidate_simulation": "candidate_simulation",
            "compatibility_engine": "compatibility_engine",
        },
    )
    graph.add_edge("candidate_simulation", "compatibility_engine")
    graph.add_edge("compatibility_engine", "synthesis")
    graph.add_edge("synthesis", END)
    return graph.compile()


async def stream_orchestrator_updates(
    *,
    team_id: str,
    user_id: str,
    include_candidates: bool,
) -> AsyncIterator[dict[str, dict[str, Any]]]:
    graph = _compiled_orchestrator_graph()
    initial_state: OrchestratorState = {
        "team_id": team_id,
        "user_id": user_id,
        "include_candidates": include_candidates,
    }
    async for update in graph.astream(initial_state, stream_mode="updates"):
        yield update


def synthesis_from_compat(total_score: float, weak_dimensions: list[str]) -> dict:
    strengths = "The team profile suggests stable collaboration patterns."
    if total_score >= 28:
        verdict = "The pair/team alignment is strong for delivery-critical work."
    elif total_score < 18:
        verdict = "The pair/team has notable friction risks in execution and planning cadence."
    else:
        verdict = "The pair/team is workable but needs intentional alignment rituals."

    if weak_dimensions:
        weak_text = ", ".join(weak_dimensions[:3])
        uncertainty = (
            f"Weak dimensions detected in {weak_text}; collect more behavioral data before final staffing decisions."
        )
    else:
        uncertainty = "No high-risk weak dimensions detected in this run."

    return {
        "run_id": str(uuid4()),
        "narrative": f"{verdict} {strengths}",
        "recommendations": [
            "Run one two-week trial sprint and review communication bottlenecks.",
            "Pair planning with a fixed decision owner to reduce ambiguity loops.",
            "Reassess compatibility after updated GitHub and assessment signals.",
        ],
        "uncertainty_note": uncertainty,
    }
