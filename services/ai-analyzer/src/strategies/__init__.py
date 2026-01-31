"""
Sport-specific AI strategies for video analysis.

Each sport module contains:
- Formation templates and detection
- Tactical patterns (offensive, defensive)
- Common mistakes and problems
- Special situations (set pieces, power plays, etc.)
"""

from .football import FootballPatternDetector, OFFENSIVE_PATTERNS as FOOTBALL_OFFENSIVE
from .hockey import HockeyPatternDetector, OFFENSIVE_PATTERNS as HOCKEY_OFFENSIVE

__all__ = [
    'FootballPatternDetector',
    'HockeyPatternDetector',
    'FOOTBALL_OFFENSIVE',
    'HOCKEY_OFFENSIVE',
]
