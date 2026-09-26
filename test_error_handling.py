import os
import time
from unittest.mock import patch, MagicMock

os.environ["GEMINI_API_KEY"] = "MOCK_KEY"
import resume_intellegence.resume_analyzer as analyzer

class MockResponse:
    def __init__(self, text):
        self.text = text

def create_exception(message):
    return Exception(message)

def test_503_retry():
    print("\n--- Testing 503 Retry ---")
    mock_func = MagicMock(side_effect=create_exception("503 UNAVAILABLE"))
    
    with patch("google.genai.models.Models.generate_content", mock_func):
        # We need to reduce time.sleep for the test
        with patch("time.sleep", return_value=None):
            try:
                analyzer.analyze_resume("mock text")
                print("FAIL: Expected RuntimeError")
            except RuntimeError as e:
                if "after maximum attempts" in str(e):
                    print(f"PASS: {e}")
                else:
                    print(f"FAIL: Unexpected error {e}")
            
    print(f"Attempts: {mock_func.call_count}")
    if mock_func.call_count == 3:
        print("PASS: Exactly 3 attempts")
    else:
        print("FAIL: Wrong number of attempts")

def test_429_stop():
    print("\n--- Testing 429 Stop ---")
    mock_func = MagicMock(side_effect=create_exception("429 RESOURCE_EXHAUSTED"))
    
    with patch("google.genai.models.Models.generate_content", mock_func):
        try:
            analyzer.analyze_resume("mock text")
            print("FAIL: Expected RuntimeError")
        except RuntimeError as e:
            if "daily quota exhausted" in str(e):
                print(f"PASS: {e}")
            else:
                print(f"FAIL: Unexpected error {e}")
            
    print(f"Attempts: {mock_func.call_count}")
    if mock_func.call_count == 1:
        print("PASS: Exactly 1 attempt")
    else:
        print("FAIL: Wrong number of attempts")

def test_4xx_stop():
    print("\n--- Testing 403 Stop ---")
    mock_func = MagicMock(side_effect=create_exception("403 Forbidden"))
    
    with patch("google.genai.models.Models.generate_content", mock_func):
        try:
            analyzer.analyze_resume("mock text")
            print("FAIL: Expected RuntimeError")
        except RuntimeError as e:
            if "API error occurred" in str(e):
                print(f"PASS: {e}")
            else:
                print(f"FAIL: Unexpected error {e}")
            
    print(f"Attempts: {mock_func.call_count}")
    if mock_func.call_count == 1:
        print("PASS: Exactly 1 attempt")
    else:
        print("FAIL: Wrong number of attempts")

def test_success():
    print("\n--- Testing Success ---")
    mock_func = MagicMock(return_value=MockResponse('{"candidate": {"name": "Test"}}'))
    
    with patch("google.genai.models.Models.generate_content", mock_func):
        try:
            res = analyzer.analyze_resume("mock text")
            print("PASS: Success")
        except Exception as e:
            print(f"FAIL: Unexpected error {e}")
            
    print(f"Attempts: {mock_func.call_count}")
    if mock_func.call_count == 1:
        print("PASS: Exactly 1 attempt")
    else:
        print("FAIL: Wrong number of attempts")

test_503_retry()
test_429_stop()
test_4xx_stop()
test_success()
