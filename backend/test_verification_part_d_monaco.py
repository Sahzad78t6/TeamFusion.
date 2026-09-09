import asyncio
import unittest
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.routers.contests import _execute_test_cases_piston, PISTON_LANG_MAP

class TestMonacoPistonIntegration(unittest.IsolatedAsyncioTestCase):

    async def test_step_1_and_2_language_mappings(self):
        """Step 1 & 2: Mappings for Monaco language selector and starter codes."""
        self.assertEqual(PISTON_LANG_MAP["python"], "python")
        self.assertEqual(PISTON_LANG_MAP["javascript"], "javascript")
        self.assertEqual(PISTON_LANG_MAP["c++"], "cpp")
        self.assertEqual(PISTON_LANG_MAP["c"], "c")
        self.assertEqual(PISTON_LANG_MAP["java"], "java")

    async def test_step_3_python_submission_with_mocked_piston(self):
        """Step 3: Correct Python solution submission returns passed: true when Piston returns 200."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "run": {"stdout": "25\n", "code": 0}
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            code = "print(5 * 5)"
            test_cases = [{"input": "5", "expected_output": "25"}]
            passed, results, error = await _execute_test_cases_piston("python", code, test_cases, timeout_sec=8.0)
            
            print(f"\n[Step 3] Python Mocked Piston - passed: {passed}, results: {results}, error: {error}")
            self.assertTrue(passed)
            self.assertEqual(len(results), 1)
            self.assertTrue(results[0].passed)
            self.assertIsNone(error)

    async def test_step_4_cpp_submission_with_mocked_piston(self):
        """Step 4: Correct C++ solution submission returns passed: true when Piston returns 200."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "run": {"stdout": "36\n", "code": 0}
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            code = "#include <iostream>\nint main() { std::cout << 36; }"
            test_cases = [{"input": "6", "expected_output": "36"}]
            passed, results, error = await _execute_test_cases_piston("c++", code, test_cases, timeout_sec=8.0)
            
            print(f"[Step 4] C++ Mocked Piston - passed: {passed}, results: {results}, error: {error}")
            self.assertTrue(passed)
            self.assertEqual(len(results), 1)
            self.assertTrue(results[0].passed)
            self.assertIsNone(error)

    async def test_step_5_timeout_handling_live_and_mock(self):
        """Step 5: Infinite-loop solution / execution timeout handling."""
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Timeout")):
            code = "while True: pass"
            test_cases = [{"input": "1", "expected_output": "1"}]
            passed, results, error = await _execute_test_cases_piston("python", code, test_cases, timeout_sec=1.0)
            
            print(f"[Step 5] Timeout handling - passed: {passed}, results: {results}, error: {error}")
            self.assertIsNone(passed)
            self.assertEqual(results, [])
            self.assertIn("Execution service unavailable", error)

    async def test_step_6_live_piston_401_whitelist_fallback(self):
        """Step 6: Live Piston endpoint returning 401 or invalid URL triggers graceful manual review fallback."""
        code = "print('hello')"
        test_cases = [{"input": "", "expected_output": "hello"}]
        passed, results, error = await _execute_test_cases_piston("python", code, test_cases, timeout_sec=2.0)
        
        print(f"[Step 6] Live Piston Fallback - passed: {passed}, results: {results}, error: {error}")
        self.assertIsNone(passed)
        self.assertEqual(results, [])
        self.assertIsNotNone(error)
        self.assertIn("Execution service unavailable", error)

if __name__ == "__main__":
    unittest.main()
