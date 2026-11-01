"""
tests/test_gemini_config.py

Unit tests for gemini_config.call_gemini, call_gemini_json, and _classify_error.

All network I/O is mocked; no real API calls are made.
All patching uses patch("gemini_config.genai.Client") to intercept the
cached-client factory.
"""
import json
import os
from unittest.mock import MagicMock, patch

import pytest

os.environ.setdefault("GEMINI_API_KEY", "MOCK_KEY_FOR_TESTS")

import gemini_config  # noqa: E402


# ---------------------------------------------------------------------------
# _classify_error — unit tests
# ---------------------------------------------------------------------------

class TestClassifyError:
    """Verify the three-tier classification logic."""

    def test_resource_exhausted_string(self):
        assert gemini_config._classify_error(Exception("429 RESOURCE_EXHAUSTED")) == "quota"

    def test_unavailable_string(self):
        assert gemini_config._classify_error(Exception("503 UNAVAILABLE")) == "unavail"

    def test_unauthenticated_string(self):
        assert gemini_config._classify_error(Exception("401 UNAUTHENTICATED")) == "auth"

    def test_permission_denied_string(self):
        assert gemini_config._classify_error(Exception("403 PERMISSION_DENIED")) == "perm"

    def test_not_found_string(self):
        assert gemini_config._classify_error(Exception("404 NOT_FOUND")) == "notfound"

    def test_numeric_429_word_boundary(self):
        # Pure numeric fallback, at word boundary.
        assert gemini_config._classify_error(Exception("error 429 exceeded")) == "quota"

    def test_no_false_positive_on_embedded_digits(self):
        # The string '1429' must NOT match the \b429\b pattern.
        assert gemini_config._classify_error(Exception("request_id=14291234")) == "other"

    def test_unknown_error(self):
        assert gemini_config._classify_error(Exception("something random")) == "other"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_response(text: str) -> MagicMock:
    m = MagicMock()
    m.text = text
    return m


def _mock_client(side_effect=None, return_value=None):
    """Return a (patched_client, mock_client_instance) pair."""
    mock_instance = MagicMock()
    if side_effect is not None:
        mock_instance.models.generate_content.side_effect = side_effect
    else:
        mock_instance.models.generate_content.return_value = return_value
    return mock_instance


# ---------------------------------------------------------------------------
# call_gemini — core tests
# ---------------------------------------------------------------------------

class TestCallGemini:

    def setup_method(self):
        os.environ["GEMINI_API_KEY"] = "MOCK_KEY"
        gemini_config._client_cache.clear()

    def teardown_method(self):
        gemini_config._client_cache.clear()

    def test_success_returns_text(self):
        """Happy path: first call succeeds and returns response text."""
        mock_inst = _mock_client(return_value=_fake_response('{"result": "ok"}'))
        with patch("gemini_config.genai.Client", return_value=mock_inst):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"result": "ok"}'
        mock_inst.models.generate_content.assert_called_once()

    def test_503_retried_then_raises(self):
        """A 503 UNAVAILABLE triggers up to max_retries_503=3 attempts per key."""
        exc = Exception("503 UNAVAILABLE service down")
        mock_inst = _mock_client(side_effect=exc)
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.time.sleep"), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            with pytest.raises(RuntimeError):
                gemini_config.call_gemini("sys", "user")
        # 1 key × 1 model × 3 attempts = 3 calls
        assert mock_inst.models.generate_content.call_count == 3

    def test_503_exhausted_rotates_key_not_model(self):
        """After exhausting 503 retries on key-1, key-2 must be tried (not next model)."""
        os.environ["GEMINI_API_KEY_2"] = "MOCK_KEY_2"
        gemini_config._client_cache.clear()

        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            # Key-1 gets 3×503, then key-2 succeeds on the 4th overall call.
            if call_count["n"] <= 3:
                raise Exception("503 UNAVAILABLE")
            return _fake_response('{"ok": true}')

        mock_inst = _mock_client()
        mock_inst.models.generate_content.side_effect = side_effect
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.time.sleep"), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"ok": true}'
        assert call_count["n"] == 4  # 3 retries on key-1, 1 success on key-2.
        del os.environ["GEMINI_API_KEY_2"]
        gemini_config._client_cache.clear()

    def test_none_text_rotates_key(self):
        """A None response.text (safety block) must rotate to the next key."""
        os.environ["GEMINI_API_KEY_2"] = "MOCK_KEY_2"
        gemini_config._client_cache.clear()

        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return _fake_response(None)  # Safety block.
            return _fake_response('{"ok": true}')

        mock_inst = _mock_client()
        mock_inst.models.generate_content.side_effect = side_effect
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"ok": true}'
        del os.environ["GEMINI_API_KEY_2"]
        gemini_config._client_cache.clear()

    def test_429_quota_rotates_key_then_raises(self):
        """429 RESOURCE_EXHAUSTED rotates to the next key; exhausting all → RuntimeError."""
        os.environ["GEMINI_API_KEY_2"] = "MOCK_KEY_2"
        gemini_config._client_cache.clear()
        exc = Exception("429 RESOURCE_EXHAUSTED quota exceeded")
        mock_inst = _mock_client(side_effect=exc)
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.time.sleep"), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            with pytest.raises(RuntimeError, match="exhausted"):
                gemini_config.call_gemini("sys", "user")
        # 429 breaks out of the retry loop after 1 attempt per key
        # 2 keys × 1 model × 1 attempt = 2 calls
        assert mock_inst.models.generate_content.call_count >= 2
        del os.environ["GEMINI_API_KEY_2"]
        gemini_config._client_cache.clear()

    def test_401_single_key_raises_after_exhaustion(self):
        """When the only key returns 401, all keys/models fail → RuntimeError."""
        exc = Exception("401 UNAUTHENTICATED invalid api key")
        mock_inst = _mock_client(side_effect=exc)
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            with pytest.raises(RuntimeError):
                gemini_config.call_gemini("sys", "user")
        # Auth error breaks retry loop after 1 attempt per key — no 503 retries.
        assert mock_inst.models.generate_content.call_count == 1

    def test_401_rotates_to_next_key_on_auth_failure(self):
        """Auth failure on first key must NOT raise — it should try the second key."""
        os.environ["GEMINI_API_KEY_2"] = "MOCK_KEY_2"
        gemini_config._client_cache.clear()

        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise Exception("401 UNAUTHENTICATED")
            return _fake_response('{"ok": true}')

        mock_inst = _mock_client()
        mock_inst.models.generate_content.side_effect = side_effect
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"ok": true}'
        assert call_count["n"] == 2  # First key failed, second succeeded.
        del os.environ["GEMINI_API_KEY_2"]
        gemini_config._client_cache.clear()

    def test_403_rotates_to_next_key_on_perm_failure(self):
        """403 PERMISSION_DENIED on first key must not abort — try next key."""
        os.environ["GEMINI_API_KEY_2"] = "MOCK_KEY_2"
        gemini_config._client_cache.clear()

        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise Exception("403 PERMISSION_DENIED")
            return _fake_response('{"ok": true}')

        mock_inst = _mock_client()
        mock_inst.models.generate_content.side_effect = side_effect
        with patch("gemini_config.genai.Client", return_value=mock_inst), \
             patch("gemini_config.get_model_chain", return_value=["mock-model"]):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"ok": true}'
        del os.environ["GEMINI_API_KEY_2"]
        gemini_config._client_cache.clear()

    def test_404_not_found_advances_model(self):
        """404 NOT_FOUND means this model doesn't exist → advance to next model."""
        os.environ["GEMINI_MODEL"] = "bad-model"
        os.environ["GEMINI_MODEL_FALLBACKS"] = "good-model"
        gemini_config._client_cache.clear()

        call_count = {"n": 0}

        def side_effect(*args, **kwargs):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise Exception("404 NOT_FOUND model does not exist")
            return _fake_response('{"ok": true}')

        mock_inst = _mock_client()
        mock_inst.models.generate_content.side_effect = side_effect
        with patch("gemini_config.genai.Client", return_value=mock_inst):
            result = gemini_config.call_gemini("sys", "user")
        assert result == '{"ok": true}'
        del os.environ["GEMINI_MODEL"]
        del os.environ["GEMINI_MODEL_FALLBACKS"]
        gemini_config._client_cache.clear()

    def test_client_reused_for_same_key(self):
        """The same API key must reuse the same genai.Client (cache hit)."""
        os.environ["GEMINI_API_KEY"] = "CACHE_TEST_KEY"
        gemini_config._client_cache.clear()

        mock_inst = _mock_client(return_value=_fake_response('{"ok": 1}'))
        with patch("gemini_config.genai.Client", return_value=mock_inst) as mock_cls:
            gemini_config.call_gemini("sys", "user1")
            # The second call uses the same key → should NOT construct a new Client
            gemini_config.call_gemini("sys", "user2")
        # Client must be constructed at most once per unique key
        assert mock_cls.call_count == 1

    def test_timeout_passed_via_http_options(self):
        """HttpOptions(timeout=ms) must be present in the GenerateContentConfig."""
        os.environ["GEMINI_REQUEST_TIMEOUT_SECONDS"] = "30"
        # Reload the module-level constant
        gemini_config._TIMEOUT_SECONDS = 30.0
        gemini_config._client_cache.clear()

        captured_configs = []

        def capture_call(*args, **kwargs):
            captured_configs.append(kwargs.get("config") or (args[2] if len(args) > 2 else None))
            return _fake_response('{"ok": true}')

        mock_inst = MagicMock()
        mock_inst.models.generate_content.side_effect = capture_call
        with patch("gemini_config.genai.Client", return_value=mock_inst):
            gemini_config.call_gemini("sys", "user")

        assert captured_configs, "generate_content was never called"
        config = captured_configs[0]
        assert config is not None
        assert config.http_options is not None
        # timeout in milliseconds (30 s → 30_000 ms)
        assert config.http_options.timeout == 30_000

        # Restore default
        gemini_config._TIMEOUT_SECONDS = 60.0
        del os.environ["GEMINI_REQUEST_TIMEOUT_SECONDS"]
        gemini_config._client_cache.clear()

    def test_no_timeout_when_zero(self):
        """When _TIMEOUT_SECONDS == 0, http_options should be None."""
        original = gemini_config._TIMEOUT_SECONDS
        gemini_config._TIMEOUT_SECONDS = 0
        gemini_config._client_cache.clear()

        captured_configs = []

        def capture_call(*args, **kwargs):
            captured_configs.append(kwargs.get("config"))
            return _fake_response('{"ok": true}')

        mock_inst = MagicMock()
        mock_inst.models.generate_content.side_effect = capture_call
        with patch("gemini_config.genai.Client", return_value=mock_inst):
            gemini_config.call_gemini("sys", "user")

        config = captured_configs[0]
        assert config is not None
        assert config.http_options is None

        gemini_config._TIMEOUT_SECONDS = original
        gemini_config._client_cache.clear()


# ---------------------------------------------------------------------------
# call_gemini_json — JSON wrapper tests
# ---------------------------------------------------------------------------

class TestCallGeminiJson:

    def setup_method(self):
        os.environ["GEMINI_API_KEY"] = "MOCK_KEY"
        gemini_config._client_cache.clear()

    def teardown_method(self):
        gemini_config._client_cache.clear()

    def test_success_returns_parsed_dict(self):
        payload = {"result": "ok"}
        with patch("gemini_config.call_gemini", return_value=json.dumps(payload)):
            result = gemini_config.call_gemini_json("sys", "user")
        assert result == payload

    def test_strips_markdown_fences(self):
        raw = "```json\n{\"key\": \"value\"}\n```"
        with patch("gemini_config.call_gemini", return_value=raw):
            result = gemini_config.call_gemini_json("sys", "user")
        assert result == {"key": "value"}

    def test_retries_on_invalid_json(self):
        """parse_attempts=2 means two calls to call_gemini before raising."""
        with patch("gemini_config.call_gemini", return_value="not json") as mock_call:
            with pytest.raises(RuntimeError, match="invalid JSON"):
                gemini_config.call_gemini_json("sys", "user", parse_attempts=2)
        assert mock_call.call_count == 2

    def test_raises_on_json_array(self):
        """A JSON array (not object) must be rejected."""
        with patch("gemini_config.call_gemini", return_value="[1,2,3]"):
            with pytest.raises(RuntimeError):
                gemini_config.call_gemini_json("sys", "user")

    def test_propagates_runtime_error(self):
        with patch("gemini_config.call_gemini",
                   side_effect=RuntimeError("quota exhausted")):
            with pytest.raises(RuntimeError, match="quota exhausted"):
                gemini_config.call_gemini_json("sys", "user")
