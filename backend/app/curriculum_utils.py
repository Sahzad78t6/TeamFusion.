from typing import Any, Dict, List, Optional

def get_current_topic(sequence: List[Dict[str, Any]], completed_topics: List[str]) -> Optional[Dict[str, Any]]:
    """
    Finds the first topic in the curriculum sequence that is NOT present in completed_topics.
    Acts as the single source of truth for the student's next active topic pointer.
    """
    completed_set = set(completed_topics or [])
    for topic in sequence:
        if topic.get("topic_code") not in completed_set:
            return topic
    return None
