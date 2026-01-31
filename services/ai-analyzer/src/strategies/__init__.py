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
from .youth_football import (
    YouthFootballDetector,
    SQUARE_PATTERNS,
    OFFER_PATTERNS,
    MARKING_PATTERNS,
    CORNER_PATTERNS,
    GOALKEEPER_OFFER_PATTERNS,
    ATTACKING_PASS_PATTERNS,
    YouthAgeGroup,
)

__all__ = [
    # General
    'FootballPatternDetector',
    'HockeyPatternDetector',
    'FOOTBALL_OFFENSIVE',
    'HOCKEY_OFFENSIVE',
    # Youth Football
    'YouthFootballDetector',
    'YouthAgeGroup',
    'SQUARE_PATTERNS',
    'OFFER_PATTERNS',
    'MARKING_PATTERNS',
    'CORNER_PATTERNS',
    'GOALKEEPER_OFFER_PATTERNS',
    'ATTACKING_PASS_PATTERNS',
]
