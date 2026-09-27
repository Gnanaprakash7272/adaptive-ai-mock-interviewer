"""PostgreSQL checkpoint configuration and integration tests.

The database-backed tests run only when LANGGRAPH_TEST_DATABASE_URL points at
a disposable PostgreSQL database. They use unique thread IDs and delete their
checkpoints.
"""

from __future__ import annotations

import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from unittest.mock import MagicMock, patch
from uuid import uuid4

os.environ.setdefault("GEMINI_API_KEY", "MOCK_KEY_FOR_TESTS")

from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command

from langgraph_workflow import interview_graph as graph_module


FAKE_QUESTION = {
    "question": "Explain dependency injection.",
    "topic": "FastAPI",
    "difficulty": "medium",
    "question_type": "technical",
    "expected_concepts": ["Depends", "inversion of control"],
}
FAKE_EVALUATION = {
    "score": 8,
    "correctness": 8,
    "completeness": 8,
    "technical_depth": 7,
    "missing_concepts": [],
    "confidence": 0.9,
    "needs_followup": False,
    "feedback": "Clear answer.",
}


def _initial_state(interview_id: int, user_id: int, role: str) -> dict:
    return {
        "user_id": user_id,
        "interview_id": interview_id,
        "candidate_profile": {
            "candidate": {"name": f"User {user_id}"},
            "skills": {"programming_languages": ["Python"]},
            "projects": [],
            "experience": [],
            "potential_interview_topics": ["FastAPI", "Python"],
        },
        "role": role,
        "role_topics": [],
        "candidate_topics": [],
        "available_topics": [],
        "current_topic": "",
        "current_difficulty": "medium",
        "topics_covered": [],
        "current_question": None,
        "current_answer": None,
        "current_evaluation": None,
        "adaptive_decision": None,
        "question_count": 0,
        "max_questions": 1,
        "is_finished": False,
        "interview_history": [],
        "final_report": None,
    }


class TestPostgresCheckpointConfiguration(unittest.TestCase):
    def test_missing_database_url_has_actionable_error(self):
        with (
            patch.dict(os.environ, {"DATABASE_URL": ""}),
            patch.object(graph_module, "_postgres_checkpointer", None),
        ):
            with self.assertRaisesRegex(RuntimeError, "DATABASE_URL is required"):
                graph_module._get_postgres_checkpointer()

    def test_database_url_sanitizes_prefix_and_quotes(self):
        pool = MagicMock()
        saver = MagicMock(spec=PostgresSaver)
        with (
            patch.dict(os.environ, {"DATABASE_URL": 'DATABASE_URL="postgresql://test-clean"'}),
            patch.object(graph_module, "_checkpoint_pool", None),
            patch.object(graph_module, "_postgres_checkpointer", None),
            patch.object(graph_module, "_create_checkpoint_pool", return_value=pool) as create_pool,
            patch.object(graph_module, "_initialize_checkpoint_schema") as initialize_schema,
            patch.object(graph_module, "PostgresSaver", return_value=saver),
        ):
            graph_module._get_postgres_checkpointer()

        create_pool.assert_called_once_with("postgresql://test-clean")
        initialize_schema.assert_called_once_with("postgresql://test-clean")

    def test_pool_uses_postgres_saver_connection_requirements(self):
        with patch.object(graph_module, "ConnectionPool") as pool_factory:
            graph_module._create_checkpoint_pool("postgresql://test")

        options = pool_factory.call_args.kwargs
        self.assertEqual(options["min_size"], 0)
        self.assertEqual(options["max_size"], 2)
        self.assertFalse(options["open"])
        self.assertEqual(options["kwargs"]["autocommit"], True)
        self.assertIs(options["kwargs"]["row_factory"], graph_module.dict_row)
        self.assertEqual(options["kwargs"]["prepare_threshold"], 0)
        self.assertIsNotNone(options["check"])

    def test_default_checkpointer_and_schema_setup_are_cached(self):
        pool = MagicMock()
        saver = MagicMock(spec=PostgresSaver)
        with (
            patch.dict(os.environ, {"DATABASE_URL": "postgresql://test"}),
            patch.object(graph_module, "_checkpoint_pool", None),
            patch.object(graph_module, "_postgres_checkpointer", None),
            patch.object(graph_module, "_create_checkpoint_pool", return_value=pool) as create_pool,
            patch.object(graph_module, "_initialize_checkpoint_schema") as initialize_schema,
            patch.object(graph_module, "PostgresSaver", return_value=saver) as saver_factory,
        ):
            result = graph_module._get_postgres_checkpointer()
            second_result = graph_module._get_postgres_checkpointer()

        self.assertIs(result, saver)
        self.assertIs(second_result, saver)
        create_pool.assert_called_once_with("postgresql://test")
        pool.open.assert_called_once_with(wait=True, timeout=10)
        initialize_schema.assert_called_once_with("postgresql://test")
        saver_factory.assert_called_once_with(pool)

    def test_schema_setup_uses_session_advisory_lock(self):
        connection = MagicMock()
        checkpointer = MagicMock()

        with (
            patch("psycopg.connect") as mock_connect,
            patch.object(graph_module, "PostgresSaver", return_value=checkpointer) as saver_type,
        ):
            mock_connect.return_value.__enter__.return_value = connection
            graph_module._initialize_checkpoint_schema("postgresql://test")

        mock_connect.assert_called_once_with(
            "postgresql://test",
            autocommit=True,
            row_factory=graph_module.dict_row,
            prepare_threshold=0,
        )
        connection.execute.assert_any_call(
            "SELECT pg_advisory_lock(%s)",
            (graph_module._CHECKPOINT_SETUP_LOCK_ID,),
        )
        connection.execute.assert_any_call(
            "SELECT pg_advisory_unlock(%s)",
            (graph_module._CHECKPOINT_SETUP_LOCK_ID,),
        )
        saver_type.assert_called_once_with(connection)
        checkpointer.setup.assert_called_once_with()

    def test_database_url_sanitizes_brackets_and_encodes_password(self):
        raw = "postgresql://postgres.project[pass@#123]@pooler.supabase.com:5432/postgres"
        expected = "postgresql://postgres.project:pass%40%23123@pooler.supabase.com:5432/postgres"
        self.assertEqual(graph_module._sanitize_database_url(raw), expected)

    def test_graph_construction_keeps_explicit_test_checkpointer(self):
        from langgraph.checkpoint.memory import MemorySaver

        graph = graph_module.build_interview_graph(checkpointer=MemorySaver())
        self.assertIn("wait_for_answer", graph.get_graph().nodes)


@unittest.skipUnless(
    os.getenv("LANGGRAPH_TEST_DATABASE_URL", "").strip(),
    "Set LANGGRAPH_TEST_DATABASE_URL to a disposable PostgreSQL database to run checkpoint integration tests.",
)
class TestPostgresCheckpointPersistence(unittest.TestCase):
    """Exercises real PostgresSaver persistence across graph instances."""

    @staticmethod
    def _test_database_url() -> str:
        return os.environ["LANGGRAPH_TEST_DATABASE_URL"].strip()

    def _new_store(self):
        database_url = self._test_database_url()
        graph_module._initialize_checkpoint_schema(database_url)
        pool = graph_module._create_checkpoint_pool(database_url)
        pool.open(wait=True, timeout=10)
        return pool, PostgresSaver(pool)

    def _unique_interview_id(self) -> int:
        return 9_000_000_000_000_000 + (uuid4().int % 1_000_000_000_000_000)

    def test_interrupt_checkpoint_and_resume_survive_new_saver(self):
        interview_id = self._unique_interview_id()
        thread_id = str(interview_id)
        config = {"configurable": {"thread_id": thread_id}}

        with ExitStack() as stack, patch.object(
            graph_module, "_generate_question", return_value=FAKE_QUESTION
        ), patch.object(
            graph_module, "_evaluate_answer", return_value=FAKE_EVALUATION
        ), patch.object(
            graph_module,
            "_decide_next_step",
            return_value={
                "next_action": "new_topic",
                "next_topic": "Python",
                "difficulty": "medium",
                "reason": "Test decision.",
            },
        ), patch.object(
            graph_module,
            "_generate_narrative",
            return_value={
                "strengths": ["Clear"],
                "weaknesses": [],
                "recommendations": [],
                "summary": "Test report.",
            },
        ):
            first_pool, first_saver = self._new_store()
            stack.callback(first_pool.close)
            first_graph = graph_module.build_interview_graph(checkpointer=first_saver)
            first_graph.invoke(
                _initial_state(interview_id, 101, "Python Backend Developer"),
                config,
            )

            paused = first_graph.get_state(config)
            self.assertIn("wait_for_answer", paused.next)
            self.assertEqual(paused.values["interview_id"], interview_id)
            self.assertEqual(paused.values["current_question"], FAKE_QUESTION)
            self.assertIsNotNone(first_saver.get(config))

            # Simulate a cold start/process restart by closing the first pool
            # and loading the same thread through an independent pool/saver.
            first_pool.close()
            second_pool, second_saver = self._new_store()
            stack.callback(second_pool.close)
            stack.callback(second_saver.delete_thread, thread_id)
            second_graph = graph_module.build_interview_graph(checkpointer=second_saver)

            restored = second_graph.get_state(config)
            self.assertIn("wait_for_answer", restored.next)
            self.assertEqual(restored.values["interview_id"], interview_id)
            self.assertEqual(restored.values["current_question"], FAKE_QUESTION)

            second_graph.invoke(Command(resume="I use Depends for injection."), config)
            completed = second_graph.get_state(config)
            self.assertTrue(completed.values["is_finished"])
            self.assertEqual(
                completed.values["interview_history"][0]["answer"],
                "I use Depends for injection.",
            )

    def test_separate_interview_threads_keep_independent_state(self):
        first_id = self._unique_interview_id()
        second_id = self._unique_interview_id()
        first_thread = str(first_id)
        second_thread = str(second_id)

        with ExitStack() as stack:
            pool, saver = self._new_store()
            stack.callback(pool.close)
            stack.callback(saver.delete_thread, first_thread)
            stack.callback(saver.delete_thread, second_thread)
            graph = graph_module.build_interview_graph(checkpointer=saver)

            with patch.object(graph_module, "_generate_question", return_value=FAKE_QUESTION):
                graph.invoke(
                    _initial_state(first_id, 201, "Python Backend Developer"),
                    {"configurable": {"thread_id": first_thread}},
                )
                graph.invoke(
                    _initial_state(second_id, 202, "React Developer"),
                    {"configurable": {"thread_id": second_thread}},
                )

            first = graph.get_state({"configurable": {"thread_id": first_thread}})
            second = graph.get_state({"configurable": {"thread_id": second_thread}})
            self.assertEqual(first.values["user_id"], 201)
            self.assertEqual(second.values["user_id"], 202)
            self.assertEqual(first.values["interview_id"], first_id)
            self.assertEqual(second.values["interview_id"], second_id)
            self.assertNotEqual(first.values["role"], second.values["role"])

    def test_concurrent_instances_serialize_checkpoint_migrations(self):
        database_url = self._test_database_url()

        def initialize_from_independent_connection() -> None:
            graph_module._initialize_checkpoint_schema(database_url)

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(initialize_from_independent_connection) for _ in range(2)]
            for future in futures:
                future.result(timeout=30)


if __name__ == "__main__":
    unittest.main(verbosity=2)
