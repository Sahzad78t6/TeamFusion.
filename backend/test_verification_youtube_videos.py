import asyncio
import unittest
import os
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.youtube_search import search_videos, _format_duration, _search_videos_sync
from app.routers.learning import get_learning_videos, VIDEO_CACHE

class TestYouTubeLiveSearchAndEmbed(unittest.IsolatedAsyncioTestCase):

    async def test_verification_1_curl_get_learning_videos_dsa(self):
        """Verification 1: GET /learning/videos?topic_code=dsa returns valid videos with video_ids and thumbnails."""
        mock_user = {"_id": "507f1f77bcf86cd799439011"}
        result = await get_learning_videos(topic_code="dsa", query=None, current_user=mock_user)
        print("\n[Verification 1] GET /learning/videos?topic_code=dsa:")
        self.assertIn("videos", result)
        videos = result["videos"]
        self.assertIsInstance(videos, list)
        self.assertGreater(len(videos), 0)
        
        first_v = videos[0]
        safe_title = first_v.get('title', '').encode('ascii', 'ignore').decode('ascii')
        print(f"   First video: ID={first_v.get('video_id')}, Title='{safe_title}', Channel='{first_v.get('channel')}', Duration={first_v.get('duration_formatted')}")
        self.assertIsNotNone(first_v.get("video_id"))
        self.assertIsNotNone(first_v.get("title"))
        self.assertIsNotNone(first_v.get("thumbnail"))
        self.assertIn("youtube.com", first_v.get("url"))

    async def test_verification_2_and_5_topic_switching_diff_content(self):
        """Verification 2 & 5: Switching topics returns genuinely different video results."""
        mock_user = {"_id": "507f1f77bcf86cd799439011"}
        res_dsa = await get_learning_videos(topic_code="dsa", query=None, current_user=mock_user)
        res_comm = await get_learning_videos(topic_code="communication", query=None, current_user=mock_user)
        
        v_dsa_ids = [v["video_id"] for v in res_dsa["videos"]]
        v_comm_ids = [v["video_id"] for v in res_comm["videos"]]
        
        print(f"[Verification 5] Topic switching check:")
        print(f"   DSA Video IDs: {v_dsa_ids[:3]}")
        print(f"   Communication Video IDs: {v_comm_ids[:3]}")
        
        self.assertNotEqual(v_dsa_ids, v_comm_ids)

    async def test_verification_6_graceful_degradation_offline(self):
        """Verification 6: Network failure/timeout degrades gracefully returning empty list without 500 error."""
        mock_user = {"_id": "507f1f77bcf86cd799439011"}
        with patch("app.routers.learning.search_videos", side_effect=Exception("Network offline")):
            res = await get_learning_videos(topic_code="uncached_offline_topic", query=None, current_user=mock_user)
            print(f"[Verification 6] Offline fallback check: result = {res}")
            self.assertEqual(res, {"videos": []})

    def test_duration_formatter_utility(self):
        """Test duration formatting helper."""
        self.assertEqual(_format_duration(305), "5:05")
        self.assertEqual(_format_duration(3665), "1:01:05")
        self.assertEqual(_format_duration(None), "10:00")

if __name__ == "__main__":
    unittest.main()
