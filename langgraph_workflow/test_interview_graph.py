"""
test_interview_graph.py

Tests for the LangGraph interview workflow.

All Gemini API calls are mocked — NO network access required.
No Supabase required.
No environment variables required.

Tests:
    1.  Graph can be constructed (nodes, edges present).
    2.  Node list matches expected specification.
    3.  Initial state → create_interview_plan updates state correctly.
    4.  Graph pauses (interrupts) at generate_question.
    5.  Interrupted state shows correct pending node.
    6.  Resume with an answer continues to evaluate_answer.
    7.  Evaluation result is stored in current_evaluation.
    8.  Adaptive decision updates current_topic and current_difficulty.
    9.  interview_history grows by one entry per completed turn.
    10. question_count increments correctly per turn.
    11. max_questions = 1 → graph routes to generate_final_report, not back to generate_question.
    12. final_report contains expected keys.
    13. Two separate sessions do not share state (isolation).
    14. should_continue returns "finish" when is_finished is True.
    15. should_continue returns "finish" when question_count >= max_questions.
    16. should_continue returns "continue" when below limit.
    17. Graph does not import Supabase.
    18. Graph does not call input().
    19. create_interview_plan raises ValueError on missing role.
    20. create_interview_plan raises ValueError on missing candidate_profile.
"""

import os
import sys
import unittest
import inspect
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

FAKE_PROFILE = {
    "candidate": {"name": "Test User", "email": "test@example.com"},
    "skills": {"programming_languages": ["Python"]},
    "projects": [],
    "experience": [],
    "education": [],
    "certifications": [],
    "achievements": [],
    "publications": [],
    "competitive_programming": {},
    "languages": [],
    "interests": [],
    "expertise_areas": ["Python Backend Development"],
    "potential_interview_topics": ["FastAPI", "Python", "REST APIs"],
}

FAKE_QUESTION = {
    "question": "Explain dependency injection in FastAPI.",
    "topic": "FastAPI",
    "difficulty": "medium",
    "question_type": "technical",
    "expected_concepts": ["Depends", "IoC", "testability"],
}

FAKE_EVALUATION = {
    "score": 8,
    "correctness": 8,
    "completeness": 7,
    "technical_depth": 8,
    "missing_concepts": [],
    "confidence": 0.9,
    "needs_followup": False,
    "feedback": "Good explanation of Depends.",
}

FAKE_EVALUATION_LOW = {
    "score": 3,
    "correctness": 3,
    "completeness": 3,
    "technical_depth": 2,
    "missing_concepts": ["IoC", "testability"],
    "confidence": 0.4,
    "needs_followup": True,
    "feedback": "Needs improvement.",
}

INITIAL_STATE = {
    "user_id": 1,
    "interview_id": None,
    "candidate_profile": FAKE_PROFILE,
    "role": "Python Backend Developer",
    "available_topics": [],
    "current_topic": "",
    "current_difficulty": "medium",
    "topics_covered": [],
    "current_question": None,
    "current_answer": None,
    "current_evaluation": None,
    "adaptive_decision": None,
    "question_count": 0,
    "max_questions": 3,
    "is_finished": False,
    "interview_history": [],
}


def make_initial_state(**overrides):
    """Return a fresh copy of INITIAL_STATE with optional overrides."""
    state = dict(INITIAL_STATE)
    state.update(overrides)
    return state


# ===========================================================================
# TEST CLASS 1 — Graph Construction
# ===========================================================================

class TestGraphConstruction(unittest.TestCase):
    """Tests 1-2: Graph can be constructed, nodes are correct."""

    def _build(self):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        return build_interview_graph(checkpointer=MemorySaver())

    def test_01_graph_can_be_constructed(self):
        """build_interview_graph() must not raise any exception."""
        graph = self._build()
        self.assertIsNotNone(graph)

    def test_02_expected_nodes_present(self):
        """Graph must contain all 5 expected nodes plus __start__ and __end__."""
        graph = self._build()
        node_names = set(graph.get_graph().nodes.keys())
        required = {
            "__start__",
            "create_interview_plan",
            "generate_question",
            "evaluate_answer",
            "adaptive_decision",
            "generate_final_report",
            "__end__",
        }
        missing = required - node_names
        self.assertEqual(
            missing, set(),
            f"Missing nodes in graph: {missing}"
        )


# ===========================================================================
# TEST CLASS 2 — create_interview_plan node
# ===========================================================================

class TestCreateInterviewPlan(unittest.TestCase):
    """Tests 3, 19, 20: plan node initialises state, raises on bad input."""

    def _run_plan_node(self, state: dict) -> dict:
        from langgraph_workflow.interview_graph import create_interview_plan
        return create_interview_plan(state)

    def test_03_plan_sets_available_topics(self):
        """create_interview_plan must extract available_topics from profile."""
        result = self._run_plan_node(make_initial_state())
        self.assertEqual(
            result["available_topics"],
            ["FastAPI", "Python", "REST APIs"],
        )

    def test_03b_plan_sets_first_topic(self):
        """create_interview_plan must set current_topic from profile topics."""
        result = self._run_plan_node(make_initial_state())
        self.assertEqual(result["current_topic"], "FastAPI")

    def test_03c_plan_resets_counters(self):
        """create_interview_plan must reset question_count and interview_history."""
        result = self._run_plan_node(make_initial_state())
        self.assertEqual(result["question_count"], 0)
        self.assertEqual(result["interview_history"], [])

    def test_03d_plan_sets_is_finished_false(self):
        """create_interview_plan must reset is_finished to False."""
        result = self._run_plan_node(make_initial_state())
        self.assertFalse(result["is_finished"])

    def test_03e_plan_respects_pre_set_topic(self):
        """create_interview_plan must not override a pre-set current_topic."""
        state = make_initial_state(current_topic="Python")
        result = self._run_plan_node(state)
        self.assertEqual(result["current_topic"], "Python")

    def test_19_plan_raises_on_missing_role(self):
        """create_interview_plan must raise ValueError when role is empty."""
        state = make_initial_state(role="")
        with self.assertRaises(ValueError):
            self._run_plan_node(state)

    def test_20_plan_raises_on_missing_profile(self):
        """create_interview_plan must raise ValueError when candidate_profile is missing."""
        state = make_initial_state(candidate_profile={})
        with self.assertRaises(ValueError):
            self._run_plan_node(state)

    def test_20b_plan_raises_on_missing_user_id(self):
        """create_interview_plan must raise ValueError when user_id is None."""
        state = make_initial_state(user_id=None)
        with self.assertRaises(ValueError):
            self._run_plan_node(state)

    def test_20c_plan_raises_on_invalid_max_questions(self):
        """create_interview_plan must raise ValueError when max_questions <= 0."""
        state = make_initial_state(max_questions=0)
        with self.assertRaises(ValueError):
            self._run_plan_node(state)


# ===========================================================================
# TEST CLASS 3 — Interrupt / Pause
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestInterrupt(unittest.TestCase):
    """Tests 4-5: Graph pauses at generate_question, next node is correct."""

    def _build_and_invoke(self, mock_q):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "interrupt-test"}}
        graph.invoke(make_initial_state(), config)
        return graph, config

    def test_04_graph_pauses_at_generate_question(self, mock_q):
        """Graph must pause (interrupt) after generate_question runs."""
        graph, config = self._build_and_invoke(mock_q)
        state_snapshot = graph.get_state(config)
        # Graph is paused — next is not empty
        self.assertGreater(
            len(state_snapshot.next),
            0,
            "Graph must be paused (next should not be empty)."
        )

    def test_05_interrupted_next_node_is_wait_for_answer(self, mock_q):
        """The pending node must be wait_for_answer when interrupted."""
        graph, config = self._build_and_invoke(mock_q)
        state_snapshot = graph.get_state(config)
        self.assertIn(
            "wait_for_answer",
            state_snapshot.next,
            "Next node after interrupt must be wait_for_answer."
        )

    def test_05b_question_count_is_one_after_pause(self, mock_q):
        """question_count must be 1 after the first question is generated."""
        graph, config = self._build_and_invoke(mock_q)
        state_values = graph.get_state(config).values
        self.assertEqual(state_values["question_count"], 1)

    def test_05c_current_question_is_set(self, mock_q):
        """current_question must be set to the fake question after pause."""
        graph, config = self._build_and_invoke(mock_q)
        state_values = graph.get_state(config).values
        self.assertIsNotNone(state_values.get("current_question"))
        self.assertEqual(
            state_values["current_question"]["question"],
            FAKE_QUESTION["question"],
        )

    def test_05d_topics_covered_has_first_topic(self, mock_q):
        """topics_covered must include the first topic after Q1 is generated."""
        graph, config = self._build_and_invoke(mock_q)
        state_values = graph.get_state(config).values
        self.assertIn("FastAPI", state_values.get("topics_covered", []))


# ===========================================================================
# TEST CLASS 4 — Resume with answer → evaluation
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestResumeAndEvaluate(unittest.TestCase):
    """Tests 6-7: Resume continues to evaluation, stores current_evaluation."""

    def _build_pause_and_resume(self, mock_q, mock_e):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "resume-test"}}
        # First invoke — pauses at generate_question
        graph.invoke(make_initial_state(max_questions=3), config)
        # Resume with candidate's answer
        graph.invoke(Command(resume="I use Depends() to inject services."), config)
        return graph, config

    def test_06_resume_continues_graph(self, mock_q, mock_e):
        """After resume, the graph must advance past generate_question."""
        graph, config = self._build_pause_and_resume(mock_q, mock_e)
        state = graph.get_state(config)
        # Graph should pause again at the SECOND wait_for_answer call
        # or be finished — either way it has moved past turn 1.
        values = state.values
        # A turn is completed so interview_history will have at least 1 item
        history = values.get("interview_history", [])
        self.assertGreaterEqual(
            len(history),
            1,
            "interview_history must have at least 1 entry after resume."
        )

    def test_07_evaluation_stored_in_state(self, mock_q, mock_e):
        """current_evaluation must be set after resume."""
        graph, config = self._build_pause_and_resume(mock_q, mock_e)
        values = graph.get_state(config).values
        # After resuming through evaluation + adaptive_decision,
        # current_evaluation should be available in state.
        # It may be cleared by the next generate_question call,
        # so check interview_history instead.
        history = values.get("interview_history", [])
        self.assertGreater(
            len(history), 0,
            "interview_history must have at least 1 entry after the first resume."
        )
        turn = history[0]
        self.assertEqual(
            turn["evaluation"]["score"],
            FAKE_EVALUATION["score"],
        )


# ===========================================================================
# TEST CLASS 5 — Adaptive Decision
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestAdaptiveDecision(unittest.TestCase):
    """Tests 8-10: Adaptive state updates, history alignment, count increment."""

    def _run_one_turn(self, mock_q, mock_e, *, max_questions=3):
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "adaptive-test"}}
        graph.invoke(make_initial_state(max_questions=max_questions), config)
        graph.invoke(Command(resume="My answer."), config)
        return graph, config

    def test_08_adaptive_updates_topic_or_difficulty(self, mock_q, mock_e):
        """
        After one turn with score=8 (strong), decide_next_step should route
        to 'new_topic' or 'harder'. State should reflect updated topic/difficulty.
        """
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        values = graph.get_state(config).values
        history = values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        decision = history[0].get("adaptive_decision", {})
        # Score=8 with 3 available topics → 'new_topic'
        self.assertIn(
            decision.get("next_action"),
            ("new_topic", "harder"),
            "With score=8 the adaptive action must be 'new_topic' or 'harder'."
        )

    def test_09_interview_history_grows_per_turn(self, mock_q, mock_e):
        """interview_history must have 1 entry after 1 completed turn."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        values = graph.get_state(config).values
        history = values.get("interview_history", [])
        self.assertEqual(
            len(history), 1,
            f"Expected 1 history entry after turn 1, got {len(history)}."
        )

    def test_10_question_count_increments(self, mock_q, mock_e):
        """question_count must be 2 after resuming into turn 2 (graph pauses at Q2)."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        values = graph.get_state(config).values
        self.assertEqual(
            values["question_count"], 2,
            "question_count must be 2 after two calls to generate_question."
        )

    def test_09b_history_record_has_correct_keys(self, mock_q, mock_e):
        """Each history entry must contain: turn, question, answer, evaluation, adaptive_decision."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        values = graph.get_state(config).values
        history = values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        turn = history[0]
        for key in ("turn", "question", "answer", "evaluation", "adaptive_decision"):
            self.assertIn(key, turn, f"History record is missing key: '{key}'.")

    def test_09c_history_answer_matches_submitted(self, mock_q, mock_e):
        """The answer in interview_history must match what was submitted."""
        graph, config = self._run_one_turn(mock_q, mock_e, max_questions=3)
        values = graph.get_state(config).values
        history = values.get("interview_history", [])
        self.assertGreater(len(history), 0)
        self.assertEqual(
            history[0]["answer"],
            "My answer.",
        )


# ===========================================================================
# TEST CLASS 6 — Termination / Final Report
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._evaluate_answer",
    return_value=FAKE_EVALUATION,
)
@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestTerminationAndFinalReport(unittest.TestCase):
    """Tests 11-12: max_questions causes routing to final report, report has correct keys."""

    def _run_full_interview(self, mock_q, mock_e, max_questions=1):
        """Run a complete interview with max_questions questions."""
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        from langgraph.types import Command
        graph = build_interview_graph(checkpointer=MemorySaver())
        config = {"configurable": {"thread_id": "termination-test"}}
        graph.invoke(make_initial_state(max_questions=max_questions), config)
        for _ in range(max_questions):
            state = graph.get_state(config)
            if not state.next:
                break
            graph.invoke(Command(resume="My answer."), config)
        return graph, config

    def test_11_max_questions_routes_to_final_report(self, mock_q, mock_e):
        """With max_questions=1, graph must not pause at generate_question again."""
        graph, config = self._run_full_interview(mock_q, mock_e, max_questions=1)
        state = graph.get_state(config)
        # Graph must be done (no pending nodes)
        self.assertEqual(
            state.next,
            (),
            f"Graph must be finished after max_questions=1. Got next={state.next}."
        )

    def test_11b_is_finished_is_true_after_completion(self, mock_q, mock_e):
        """is_finished must be True after the interview completes."""
        graph, config = self._run_full_interview(mock_q, mock_e, max_questions=1)
        values = graph.get_state(config).values
        self.assertTrue(
            values.get("is_finished"),
            "is_finished must be True after the interview finishes."
        )

    def test_12_final_report_has_expected_keys(self, mock_q, mock_e):
        """final_report must contain all expected summary keys."""
        graph, config = self._run_full_interview(mock_q, mock_e, max_questions=1)
        values = graph.get_state(config).values
        report = values.get("final_report")
        self.assertIsNotNone(report, "final_report must exist in state after completion.")
        for key in (
            "user_id",
            "role",
            "total_questions",
            "overall_score",
            "topics_covered",
            "adaptive_actions",
            "missing_concepts",
            "feedback_notes",
            "turn_details",
        ):
            self.assertIn(key, report, f"final_report is missing key: '{key}'.")

    def test_12b_final_report_overall_score_matches_evaluation(self, mock_q, mock_e):
        """final_report overall_score must equal the mean of all turn scores."""
        graph, config = self._run_full_interview(mock_q, mock_e, max_questions=1)
        values = graph.get_state(config).values
        report = values.get("final_report", {})
        # With 1 turn, score=8 → overall = 8.0
        self.assertEqual(
            report.get("overall_score"),
            float(FAKE_EVALUATION["score"]),
        )

    def test_12c_final_report_has_one_turn_detail(self, mock_q, mock_e):
        """final_report turn_details must have exactly max_questions entries."""
        graph, config = self._run_full_interview(mock_q, mock_e, max_questions=1)
        values = graph.get_state(config).values
        report = values.get("final_report", {})
        self.assertEqual(
            len(report.get("turn_details", [])),
            1,
        )


# ===========================================================================
# TEST CLASS 7 — Session Isolation
# ===========================================================================

@patch(
    "langgraph_workflow.interview_graph._generate_question",
    return_value=FAKE_QUESTION,
)
class TestSessionIsolation(unittest.TestCase):
    """Test 13: Two sessions must not share state."""

    def test_13_two_sessions_do_not_share_state(self, mock_q):
        """
        Two separate thread_ids must have independent checkpointed state.
        Modifying one must not affect the other.
        """
        from langgraph_workflow.interview_graph import build_interview_graph
        from langgraph.checkpoint.memory import MemorySaver
        memory = MemorySaver()
        graph = build_interview_graph(checkpointer=memory)

        config_a = {"configurable": {"thread_id": "session-a"}}
        config_b = {"configurable": {"thread_id": "session-b"}}

        # Start session A (max_questions=5)
        graph.invoke(make_initial_state(max_questions=5, user_id=1), config_a)
        # Start session B (max_questions=2)
        graph.invoke(make_initial_state(max_questions=2, user_id=2), config_b)

        state_a = graph.get_state(config_a).values
        state_b = graph.get_state(config_b).values

        # Each session has its own question_count (both should be 1 here)
        self.assertEqual(state_a["question_count"], 1)
        self.assertEqual(state_b["question_count"], 1)

        # max_questions must be session-specific
        self.assertEqual(state_a["max_questions"], 5)
        self.assertEqual(state_b["max_questions"], 2)

        # user_id must be session-specific
        self.assertEqual(state_a["user_id"], 1)
        self.assertEqual(state_b["user_id"], 2)


# ===========================================================================
# TEST CLASS 8 — should_continue router
# ===========================================================================

class TestShouldContinueRouter(unittest.TestCase):
    """Tests 14-16: Conditional router returns correct route strings."""

    def _router(self, state: dict) -> str:
        from langgraph_workflow.interview_graph import should_continue
        return should_continue(state)

    def test_14_finish_when_is_finished_true(self):
        """should_continue must return 'finish' when is_finished is True."""
        state = {"is_finished": True, "question_count": 1, "max_questions": 3}
        self.assertEqual(self._router(state), "finish")

    def test_15_finish_when_count_ge_max(self):
        """should_continue must return 'finish' when question_count >= max_questions."""
        state = {"is_finished": False, "question_count": 3, "max_questions": 3}
        self.assertEqual(self._router(state), "finish")

    def test_15b_finish_when_count_exceeds_max(self):
        """should_continue must return 'finish' when question_count > max_questions."""
        state = {"is_finished": False, "question_count": 5, "max_questions": 3}
        self.assertEqual(self._router(state), "finish")

    def test_16_continue_when_below_limit(self):
        """should_continue must return 'continue' when question_count < max_questions."""
        state = {"is_finished": False, "question_count": 2, "max_questions": 5}
        self.assertEqual(self._router(state), "continue")

    def test_16b_continue_at_zero(self):
        """should_continue must return 'continue' at question_count=0."""
        state = {"is_finished": False, "question_count": 0, "max_questions": 5}
        self.assertEqual(self._router(state), "continue")


# ===========================================================================
# TEST CLASS 9 — Dependency checks
# ===========================================================================

class TestGraphDependencies(unittest.TestCase):
    """Tests 17-18: Graph must not import Supabase or use input()."""

    def _get_module_source(self):
        import langgraph_workflow.interview_graph as module
        return inspect.getsource(module)

    def test_17_graph_does_not_import_supabase(self):
        """interview_graph.py must not import supabase."""
        source = self._get_module_source()
        self.assertNotIn(
            "import supabase",
            source,
            "interview_graph.py must not import supabase."
        )
        self.assertNotIn(
            "supabase.table",
            source,
            "interview_graph.py must not call supabase.table()."
        )
        self.assertNotIn(
            "SUPABASE_URL",
            source,
            "interview_graph.py must not reference SUPABASE_URL."
        )

    def test_18_graph_does_not_use_input(self):
        """interview_graph.py must not call input() anywhere."""
        source = self._get_module_source()
        import ast
        
        # Parse the source to strictly find input() calls, ignoring docstrings.
        class InputFinder(ast.NodeVisitor):
            def __init__(self):
                self.calls = 0
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name) and node.func.id == "input":
                    self.calls += 1
                self.generic_visit(node)
                
        tree = ast.parse(source)
        finder = InputFinder()
        finder.visit(tree)
        calls = finder.calls
        self.assertEqual(
            calls, 0,
            "interview_graph.py must not use input() — no CLI blocking allowed."
        )


# ===========================================================================
# TEST CLASS 10 — evaluate_answer node validation
# ===========================================================================

class TestEvaluateAnswerNode(unittest.TestCase):
    """Node-level validation for evaluate_answer."""

    def _run_node(self, state):
        from langgraph_workflow.interview_graph import evaluate_answer
        return evaluate_answer(state)

    def test_evaluate_raises_without_question(self):
        """evaluate_answer must raise RuntimeError when current_question is None."""
        state = {
            "current_question": None,
            "current_answer": "some answer",
        }
        with self.assertRaises(RuntimeError):
            self._run_node(state)

    def test_evaluate_raises_without_answer(self):
        """evaluate_answer must raise RuntimeError when current_answer is empty."""
        state = {
            "current_question": FAKE_QUESTION,
            "current_answer": "",
        }
        with self.assertRaises(RuntimeError):
            self._run_node(state)

    @patch(
        "langgraph_workflow.interview_graph._evaluate_answer",
        return_value=FAKE_EVALUATION,
    )
    def test_evaluate_stores_evaluation(self, mock_e):
        """evaluate_answer must store the evaluation in current_evaluation."""
        state = {
            "current_question": FAKE_QUESTION,
            "current_answer": "My detailed answer.",
        }
        result = self._run_node(state)
        self.assertIn("current_evaluation", result)
        self.assertEqual(result["current_evaluation"]["score"], 8)


# ===========================================================================
# TEST CLASS 11 — adaptive_decision node validation
# ===========================================================================

class TestAdaptiveDecisionNode(unittest.TestCase):
    """Node-level validation for adaptive_decision."""

    def _run_node(self, state):
        from langgraph_workflow.interview_graph import adaptive_decision
        return adaptive_decision(state)

    def test_adaptive_raises_without_evaluation(self):
        """adaptive_decision must raise RuntimeError when current_evaluation is None."""
        state = {
            "current_evaluation": None,
            "current_topic": "FastAPI",
            "current_difficulty": "medium",
            "topics_covered": ["FastAPI"],
            "available_topics": ["FastAPI", "Python"],
            "question_count": 1,
            "max_questions": 3,
            "current_question": FAKE_QUESTION,
            "current_answer": "answer",
            "interview_history": [],
        }
        with self.assertRaises(RuntimeError):
            self._run_node(state)

    def test_adaptive_appends_history(self):
        """adaptive_decision must append a new entry to interview_history."""
        state = {
            "current_evaluation": FAKE_EVALUATION,
            "current_topic": "FastAPI",
            "current_difficulty": "medium",
            "topics_covered": ["FastAPI"],
            "available_topics": ["FastAPI", "Python", "REST APIs"],
            "question_count": 1,
            "max_questions": 3,
            "current_question": FAKE_QUESTION,
            "current_answer": "Good answer.",
            "interview_history": [],
        }
        result = self._run_node(state)
        self.assertEqual(len(result["interview_history"]), 1)

    def test_adaptive_marks_finished_at_limit(self):
        """adaptive_decision must set is_finished=True when question_count>=max_questions."""
        state = {
            "current_evaluation": FAKE_EVALUATION,
            "current_topic": "FastAPI",
            "current_difficulty": "medium",
            "topics_covered": ["FastAPI"],
            "available_topics": ["FastAPI"],
            "question_count": 3,      # equals max_questions
            "max_questions": 3,
            "current_question": FAKE_QUESTION,
            "current_answer": "Answer.",
            "interview_history": [],
        }
        result = self._run_node(state)
        self.assertTrue(result["is_finished"])


# ===========================================================================
# Entry point
# ===========================================================================

if __name__ == "__main__":
    unittest.main(verbosity=2)
