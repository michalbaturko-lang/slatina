"""
Pattern Matcher for detecting predefined strategies and situations.

This module matches player positions and movement patterns against
predefined strategy templates.
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from scipy.optimize import linear_sum_assignment


@dataclass
class PlayerPosition:
    """Normalized player position (0-1 range for both x and y)."""
    x: float
    y: float
    team: Optional[str] = None
    player_id: Optional[int] = None


@dataclass
class StrategyPattern:
    """A predefined strategy pattern to match against."""
    id: str
    name: str
    sport: str
    description: str
    player_positions: List[Dict[str, Any]]
    event_sequence: Optional[List[Dict[str, Any]]] = None
    tolerance: float = 0.15  # Default position tolerance


@dataclass
class PatternMatch:
    """Result of pattern matching."""
    pattern_id: str
    pattern_name: str
    confidence: float
    timestamp: float
    matched_players: Dict[str, int]  # role -> player_id
    details: Dict[str, Any]


class PatternMatcher:
    """Match player formations and movements against strategy patterns."""

    def __init__(self, patterns: List[StrategyPattern]):
        self.patterns = patterns
        self.event_buffer: List[Tuple[str, float]] = []  # (event_type, timestamp)
        self.buffer_duration = 30.0  # Keep 30 seconds of events

    def add_event(self, event_type: str, timestamp: float):
        """Add an event to the buffer."""
        self.event_buffer.append((event_type, timestamp))
        # Clean old events
        self.event_buffer = [
            (e, t) for e, t in self.event_buffer
            if timestamp - t < self.buffer_duration
        ]

    def match_positions(
        self,
        players: List[PlayerPosition],
        timestamp: float,
        field_width: float = 1.0,
        field_height: float = 1.0,
    ) -> List[PatternMatch]:
        """
        Match current player positions against all patterns.

        Args:
            players: List of normalized player positions
            timestamp: Current video timestamp
            field_width: Field width for normalization
            field_height: Field height for normalization

        Returns:
            List of matched patterns with confidence scores
        """
        matches = []

        for pattern in self.patterns:
            if not pattern.player_positions:
                continue

            # Try to match player positions
            match_result = self._match_formation(
                players, pattern.player_positions, pattern.tolerance
            )

            if match_result:
                confidence, player_mapping = match_result

                # Check event sequence if defined
                if pattern.event_sequence:
                    seq_match = self._match_event_sequence(
                        pattern.event_sequence, timestamp
                    )
                    if seq_match:
                        confidence = (confidence + seq_match) / 2
                    else:
                        confidence *= 0.5  # Reduce confidence if sequence doesn't match

                if confidence > 0.5:  # Minimum threshold
                    matches.append(
                        PatternMatch(
                            pattern_id=pattern.id,
                            pattern_name=pattern.name,
                            confidence=confidence,
                            timestamp=timestamp,
                            matched_players=player_mapping,
                            details={"formation_confidence": match_result[0]},
                        )
                    )

        # Sort by confidence
        matches.sort(key=lambda m: m.confidence, reverse=True)
        return matches

    def _match_formation(
        self,
        players: List[PlayerPosition],
        expected_positions: List[Dict[str, Any]],
        tolerance: float,
    ) -> Optional[Tuple[float, Dict[str, int]]]:
        """
        Match players to expected positions using Hungarian algorithm.

        Returns (confidence, player_mapping) or None if no good match.
        """
        if len(players) < len(expected_positions):
            return None

        # Build cost matrix
        n_players = len(players)
        n_positions = len(expected_positions)
        cost_matrix = np.zeros((n_players, n_positions))

        for i, player in enumerate(players):
            for j, expected in enumerate(expected_positions):
                exp_pos = expected.get("relativePosition", {})
                exp_x = exp_pos.get("x", 0.5)
                exp_y = exp_pos.get("y", 0.5)

                # Calculate distance
                distance = np.sqrt((player.x - exp_x) ** 2 + (player.y - exp_y) ** 2)
                pos_tolerance = expected.get("tolerance", tolerance)

                # Convert to cost (higher distance = higher cost)
                if distance <= pos_tolerance:
                    cost_matrix[i, j] = distance / pos_tolerance
                else:
                    cost_matrix[i, j] = 10.0  # High cost for out-of-tolerance

        # Solve assignment problem
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # Calculate confidence based on average cost
        total_cost = sum(cost_matrix[r, c] for r, c in zip(row_ind, col_ind))
        avg_cost = total_cost / n_positions

        if avg_cost > 1.5:  # Too high cost = no match
            return None

        confidence = max(0, 1 - avg_cost)

        # Build player mapping
        player_mapping = {}
        for r, c in zip(row_ind, col_ind):
            if cost_matrix[r, c] < 10:  # Valid match
                role = expected_positions[c].get("role", f"position_{c}")
                if players[r].player_id is not None:
                    player_mapping[role] = players[r].player_id

        return (confidence, player_mapping)

    def _match_event_sequence(
        self,
        expected_sequence: List[Dict[str, Any]],
        current_time: float,
    ) -> Optional[float]:
        """
        Check if recent events match the expected sequence.

        Returns confidence score or None if no match.
        """
        if not self.event_buffer:
            return None

        # Build list of recent events sorted by time
        recent_events = sorted(self.event_buffer, key=lambda x: x[1])

        # Try to match sequence
        seq_idx = 0
        last_match_time = None
        matches = 0

        for event_type, event_time in recent_events:
            if seq_idx >= len(expected_sequence):
                break

            expected = expected_sequence[seq_idx]
            expected_type = expected.get("event")
            max_delta = expected.get("maxTimeDelta", 5000) / 1000  # Convert ms to s

            if event_type == expected_type:
                if last_match_time is None or event_time - last_match_time <= max_delta:
                    matches += 1
                    last_match_time = event_time
                    seq_idx += 1

        if matches == 0:
            return None

        return matches / len(expected_sequence)


# Predefined patterns for common sports situations
FOOTBALL_PATTERNS = [
    StrategyPattern(
        id="counter-attack",
        name="Rychlý protiútok",
        sport="football",
        description="Rychlý přechod z obrany do útoku po zisku míče",
        player_positions=[
            {"role": "defender", "relativePosition": {"x": 0.3, "y": 0.5}, "tolerance": 0.15},
            {"role": "midfielder", "relativePosition": {"x": 0.5, "y": 0.5}, "tolerance": 0.2},
            {"role": "forward", "relativePosition": {"x": 0.8, "y": 0.5}, "tolerance": 0.2},
        ],
        event_sequence=[
            {"event": "ball_recovery", "maxTimeDelta": 0},
            {"event": "pass", "maxTimeDelta": 3000},
            {"event": "shot", "maxTimeDelta": 8000},
        ],
    ),
    StrategyPattern(
        id="high-press",
        name="Vysoký presink",
        sport="football",
        description="Agresivní napadání soupeře ve vysoké pozici",
        player_positions=[
            {"role": "forward1", "relativePosition": {"x": 0.85, "y": 0.3}, "tolerance": 0.15},
            {"role": "forward2", "relativePosition": {"x": 0.85, "y": 0.7}, "tolerance": 0.15},
            {"role": "midfielder1", "relativePosition": {"x": 0.7, "y": 0.5}, "tolerance": 0.15},
        ],
    ),
    StrategyPattern(
        id="defensive-line",
        name="Obranná linie",
        sport="football",
        description="Kompaktní obranná formace",
        player_positions=[
            {"role": "lb", "relativePosition": {"x": 0.25, "y": 0.2}, "tolerance": 0.1},
            {"role": "cb1", "relativePosition": {"x": 0.25, "y": 0.4}, "tolerance": 0.1},
            {"role": "cb2", "relativePosition": {"x": 0.25, "y": 0.6}, "tolerance": 0.1},
            {"role": "rb", "relativePosition": {"x": 0.25, "y": 0.8}, "tolerance": 0.1},
        ],
    ),
    StrategyPattern(
        id="offensive-gap",
        name="Mezera v obraně",
        sport="football",
        description="Detekce mezery mezi obránci",
        player_positions=[
            {"role": "defender1", "relativePosition": {"x": 0.2, "y": 0.3}, "tolerance": 0.15},
            {"role": "defender2", "relativePosition": {"x": 0.2, "y": 0.7}, "tolerance": 0.15},
            # Gap in the middle - no defender at 0.5
        ],
    ),
]

HOCKEY_PATTERNS = [
    StrategyPattern(
        id="power-play-umbrella",
        name="Přesilovka - Umbrella",
        sport="hockey",
        description="Formace pro přesilovku 5 na 4",
        player_positions=[
            {"role": "point", "relativePosition": {"x": 0.5, "y": 0.2}, "tolerance": 0.1},
            {"role": "half-wall-left", "relativePosition": {"x": 0.3, "y": 0.4}, "tolerance": 0.1},
            {"role": "half-wall-right", "relativePosition": {"x": 0.7, "y": 0.4}, "tolerance": 0.1},
            {"role": "net-front", "relativePosition": {"x": 0.5, "y": 0.7}, "tolerance": 0.1},
            {"role": "bumper", "relativePosition": {"x": 0.5, "y": 0.5}, "tolerance": 0.1},
        ],
    ),
    StrategyPattern(
        id="forecheck-1-2-2",
        name="Forecheck 1-2-2",
        sport="hockey",
        description="Napadání v útočném pásmu",
        player_positions=[
            {"role": "f1", "relativePosition": {"x": 0.8, "y": 0.5}, "tolerance": 0.15},
            {"role": "f2", "relativePosition": {"x": 0.6, "y": 0.3}, "tolerance": 0.15},
            {"role": "f3", "relativePosition": {"x": 0.6, "y": 0.7}, "tolerance": 0.15},
            {"role": "d1", "relativePosition": {"x": 0.4, "y": 0.3}, "tolerance": 0.15},
            {"role": "d2", "relativePosition": {"x": 0.4, "y": 0.7}, "tolerance": 0.15},
        ],
    ),
]


def load_patterns_for_sport(sport: str) -> List[StrategyPattern]:
    """Load predefined patterns for a sport."""
    if sport == "football":
        return FOOTBALL_PATTERNS
    elif sport == "hockey":
        return HOCKEY_PATTERNS
    return []


def load_custom_patterns(patterns_json: List[Dict]) -> List[StrategyPattern]:
    """Load custom patterns from JSON."""
    patterns = []
    for p in patterns_json:
        patterns.append(
            StrategyPattern(
                id=p.get("id", "custom"),
                name=p.get("name", "Custom Pattern"),
                sport=p.get("sport", "football"),
                description=p.get("description", ""),
                player_positions=p.get("playerPositions", []),
                event_sequence=p.get("eventSequence"),
                tolerance=p.get("tolerance", 0.15),
            )
        )
    return patterns
