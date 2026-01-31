"""
Football (Soccer) Specific AI Strategies

Contains predefined patterns, formations, and tactical situations
for automatic detection in football match videos.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np


class FormationType(Enum):
    """Standard football formations."""
    F_4_4_2 = "4-4-2"
    F_4_3_3 = "4-3-3"
    F_4_2_3_1 = "4-2-3-1"
    F_3_5_2 = "3-5-2"
    F_5_3_2 = "5-3-2"
    F_4_1_4_1 = "4-1-4-1"


class PlayerRole(Enum):
    """Player positions/roles."""
    GOALKEEPER = "goalkeeper"
    CENTER_BACK = "center_back"
    FULL_BACK = "full_back"
    DEFENSIVE_MID = "defensive_mid"
    CENTRAL_MID = "central_mid"
    ATTACKING_MID = "attacking_mid"
    WINGER = "winger"
    STRIKER = "striker"


@dataclass
class TacticalPattern:
    """A tactical pattern to detect."""
    id: str
    name: str
    name_cz: str  # Czech name
    description: str
    category: str
    severity: str  # 'info', 'warning', 'critical'
    detection_rules: Dict[str, Any]


@dataclass
class FormationTemplate:
    """Formation position template."""
    formation_type: FormationType
    positions: Dict[PlayerRole, List[Tuple[float, float]]]  # Normalized positions


# =============================================================================
# FORMATION TEMPLATES
# =============================================================================

FORMATION_TEMPLATES = {
    FormationType.F_4_4_2: FormationTemplate(
        formation_type=FormationType.F_4_4_2,
        positions={
            PlayerRole.GOALKEEPER: [(0.5, 0.95)],
            PlayerRole.FULL_BACK: [(0.15, 0.75), (0.85, 0.75)],
            PlayerRole.CENTER_BACK: [(0.35, 0.80), (0.65, 0.80)],
            PlayerRole.WINGER: [(0.10, 0.50), (0.90, 0.50)],
            PlayerRole.CENTRAL_MID: [(0.35, 0.55), (0.65, 0.55)],
            PlayerRole.STRIKER: [(0.35, 0.25), (0.65, 0.25)],
        }
    ),
    FormationType.F_4_3_3: FormationTemplate(
        formation_type=FormationType.F_4_3_3,
        positions={
            PlayerRole.GOALKEEPER: [(0.5, 0.95)],
            PlayerRole.FULL_BACK: [(0.15, 0.75), (0.85, 0.75)],
            PlayerRole.CENTER_BACK: [(0.35, 0.80), (0.65, 0.80)],
            PlayerRole.CENTRAL_MID: [(0.30, 0.55), (0.50, 0.50), (0.70, 0.55)],
            PlayerRole.WINGER: [(0.15, 0.25), (0.85, 0.25)],
            PlayerRole.STRIKER: [(0.50, 0.20)],
        }
    ),
    FormationType.F_4_2_3_1: FormationTemplate(
        formation_type=FormationType.F_4_2_3_1,
        positions={
            PlayerRole.GOALKEEPER: [(0.5, 0.95)],
            PlayerRole.FULL_BACK: [(0.15, 0.75), (0.85, 0.75)],
            PlayerRole.CENTER_BACK: [(0.35, 0.80), (0.65, 0.80)],
            PlayerRole.DEFENSIVE_MID: [(0.35, 0.60), (0.65, 0.60)],
            PlayerRole.WINGER: [(0.15, 0.40), (0.85, 0.40)],
            PlayerRole.ATTACKING_MID: [(0.50, 0.35)],
            PlayerRole.STRIKER: [(0.50, 0.20)],
        }
    ),
}


# =============================================================================
# TACTICAL PATTERNS - OFFENSIVE
# =============================================================================

OFFENSIVE_PATTERNS: List[TacticalPattern] = [
    TacticalPattern(
        id="counter_attack",
        name="Counter Attack",
        name_cz="Rychlý protiútok",
        description="Quick transition from defense to attack after ball recovery",
        category="offensive",
        severity="info",
        detection_rules={
            "sequence": [
                {"event": "ball_recovery", "zone": "defensive_third"},
                {"event": "forward_pass", "max_time_delta": 3.0},
                {"event": "shot_or_cross", "max_time_delta": 10.0, "zone": "attacking_third"},
            ],
            "min_speed": 15.0,  # km/h average speed of ball carrier
            "max_duration": 12.0,  # seconds
        }
    ),
    TacticalPattern(
        id="through_ball",
        name="Through Ball",
        name_cz="Kolmice za obranu",
        description="Pass played behind the defensive line",
        category="offensive",
        severity="info",
        detection_rules={
            "pass_type": "through",
            "receiver_ahead_of_defenders": True,
            "pass_direction": "forward",
            "min_distance": 15.0,  # meters
        }
    ),
    TacticalPattern(
        id="overlap_run",
        name="Overlapping Run",
        name_cz="Přeběhnutí krajního obránce",
        description="Full-back overlapping the winger",
        category="offensive",
        severity="info",
        detection_rules={
            "player_role": PlayerRole.FULL_BACK,
            "run_direction": "forward",
            "passes_teammate": True,
            "zone": "wide",
            "min_distance": 20.0,
        }
    ),
    TacticalPattern(
        id="one_two_pass",
        name="One-Two Pass (Wall Pass)",
        name_cz="Dvojice (zeď)",
        description="Quick give-and-go pass combination",
        category="offensive",
        severity="info",
        detection_rules={
            "sequence": [
                {"event": "pass", "player": "A"},
                {"event": "pass", "player": "B", "max_time_delta": 2.0},
            ],
            "receiver_same_as_first_passer": True,
            "first_passer_moved_forward": True,
        }
    ),
    TacticalPattern(
        id="switch_of_play",
        name="Switch of Play",
        name_cz="Přenos hry na druhou stranu",
        description="Long pass to switch the point of attack",
        category="offensive",
        severity="info",
        detection_rules={
            "pass_type": "long",
            "horizontal_distance": 30.0,  # meters minimum
            "crosses_center": True,
        }
    ),
    TacticalPattern(
        id="third_man_run",
        name="Third Man Run",
        name_cz="Nabídka třetího hráče",
        description="Third player making a run to receive the ball",
        category="offensive",
        severity="info",
        detection_rules={
            "sequence": [
                {"event": "pass", "player": "A", "to": "B"},
                {"event": "run", "player": "C", "direction": "into_space"},
                {"event": "pass", "player": "B", "to": "C", "max_time_delta": 3.0},
            ],
        }
    ),
]


# =============================================================================
# TACTICAL PATTERNS - DEFENSIVE
# =============================================================================

DEFENSIVE_PATTERNS: List[TacticalPattern] = [
    TacticalPattern(
        id="high_press",
        name="High Press",
        name_cz="Vysoký presink",
        description="Team pressing high up the pitch",
        category="defensive",
        severity="info",
        detection_rules={
            "team_avg_position_y": 0.35,  # In opponent's half
            "compact_formation": True,
            "vertical_compactness": 25.0,  # meters max between lines
            "duration": 5.0,  # seconds minimum
        }
    ),
    TacticalPattern(
        id="offside_trap",
        name="Offside Trap",
        name_cz="Ofsajdová past",
        description="Defensive line stepping up to catch attackers offside",
        category="defensive",
        severity="info",
        detection_rules={
            "defensive_line_movement": "forward",
            "synchronized": True,
            "min_players": 3,
            "timing": "on_pass",
        }
    ),
    TacticalPattern(
        id="defensive_block",
        name="Low Defensive Block",
        name_cz="Nízký obranný blok",
        description="Team sitting deep in compact formation",
        category="defensive",
        severity="info",
        detection_rules={
            "team_avg_position_y": 0.75,  # In own half, near box
            "compact_formation": True,
            "vertical_compactness": 20.0,
            "horizontal_compactness": 35.0,
        }
    ),
    TacticalPattern(
        id="pressing_trigger",
        name="Pressing Trigger",
        name_cz="Spouštěč presingu",
        description="Specific situation triggering team press",
        category="defensive",
        severity="info",
        detection_rules={
            "triggers": [
                "back_pass_to_goalkeeper",
                "ball_to_full_back",
                "poor_first_touch",
                "player_facing_own_goal",
            ],
            "team_reaction_time": 1.5,  # seconds
        }
    ),
]


# =============================================================================
# TACTICAL PATTERNS - MISTAKES/PROBLEMS
# =============================================================================

MISTAKE_PATTERNS: List[TacticalPattern] = [
    TacticalPattern(
        id="exposed_flank",
        name="Exposed Flank",
        name_cz="Nepokrytý kraj",
        description="Wide area left undefended",
        category="defensive_mistake",
        severity="warning",
        detection_rules={
            "zone": "wide",
            "no_defender_in_zone": True,
            "opponent_in_zone": True,
            "ball_approaching": True,
        }
    ),
    TacticalPattern(
        id="broken_defensive_line",
        name="Broken Defensive Line",
        name_cz="Rozpadlá obranná linie",
        description="Gap in the defensive line",
        category="defensive_mistake",
        severity="warning",
        detection_rules={
            "gap_between_defenders": 15.0,  # meters
            "opponent_in_gap": True,
        }
    ),
    TacticalPattern(
        id="player_out_of_position",
        name="Player Out of Position",
        name_cz="Hráč mimo pozici",
        description="Player significantly out of their expected position",
        category="defensive_mistake",
        severity="warning",
        detection_rules={
            "distance_from_expected": 20.0,  # meters
            "duration": 5.0,  # seconds
            "team_in_defense": True,
        }
    ),
    TacticalPattern(
        id="no_cover",
        name="No Defensive Cover",
        name_cz="Chybí zajištění",
        description="Defender engaging without backup",
        category="defensive_mistake",
        severity="warning",
        detection_rules={
            "defender_pressing": True,
            "no_teammate_behind": True,
            "distance_to_nearest_teammate": 15.0,  # meters minimum
        }
    ),
    TacticalPattern(
        id="ball_watching",
        name="Ball Watching",
        name_cz="Sledování míče (ztráta hráče)",
        description="Defender loses track of opponent while watching ball",
        category="defensive_mistake",
        severity="critical",
        detection_rules={
            "defender_orientation": "towards_ball",
            "opponent_behind_defender": True,
            "opponent_unmarked": True,
            "ball_distance": 15.0,  # meters - ball is far
        }
    ),
    TacticalPattern(
        id="too_narrow_defense",
        name="Defense Too Narrow",
        name_cz="Příliš úzká obrana",
        description="Defensive line too compact horizontally",
        category="defensive_mistake",
        severity="warning",
        detection_rules={
            "horizontal_spread": 25.0,  # meters max (should be more)
            "opponent_wide": True,
        }
    ),
    TacticalPattern(
        id="slow_transition",
        name="Slow Defensive Transition",
        name_cz="Pomalý přechod do obrany",
        description="Team too slow to get back after losing possession",
        category="defensive_mistake",
        severity="critical",
        detection_rules={
            "ball_lost_zone": "attacking_third",
            "players_behind_ball": {"count": 4, "max_time": 5.0},
            "opponent_counter_attacking": True,
        }
    ),
]


# =============================================================================
# SET PIECE PATTERNS
# =============================================================================

SET_PIECE_PATTERNS: List[TacticalPattern] = [
    TacticalPattern(
        id="corner_near_post",
        name="Corner - Near Post Run",
        name_cz="Roh - náběh na přední tyč",
        description="Player attacking the near post from corner",
        category="set_piece",
        severity="info",
        detection_rules={
            "situation": "corner_kick",
            "run_target": "near_post",
            "timing": "before_kick",
        }
    ),
    TacticalPattern(
        id="corner_far_post",
        name="Corner - Far Post Run",
        name_cz="Roh - náběh na zadní tyč",
        description="Player attacking the far post from corner",
        category="set_piece",
        severity="info",
        detection_rules={
            "situation": "corner_kick",
            "run_target": "far_post",
            "timing": "during_kick",
        }
    ),
    TacticalPattern(
        id="free_kick_wall_gap",
        name="Free Kick Wall Gap",
        name_cz="Mezera ve zdi",
        description="Gap in the defensive wall at free kick",
        category="set_piece_mistake",
        severity="warning",
        detection_rules={
            "situation": "free_kick",
            "wall_gap_size": 1.0,  # meters
            "shot_through_gap": True,
        }
    ),
]


# =============================================================================
# PATTERN DETECTOR CLASS
# =============================================================================

class FootballPatternDetector:
    """Detects tactical patterns in football match data."""

    def __init__(self):
        self.patterns = (
            OFFENSIVE_PATTERNS +
            DEFENSIVE_PATTERNS +
            MISTAKE_PATTERNS +
            SET_PIECE_PATTERNS
        )
        self.formation_templates = FORMATION_TEMPLATES

    def detect_formation(
        self,
        player_positions: List[Tuple[float, float]],
        threshold: float = 0.15
    ) -> Optional[FormationType]:
        """
        Detect the current formation based on player positions.

        Args:
            player_positions: List of (x, y) normalized positions for outfield players
            threshold: Maximum average distance to template positions

        Returns:
            Detected formation type or None
        """
        if len(player_positions) != 10:  # Outfield players only
            return None

        best_match = None
        best_score = float('inf')

        for formation_type, template in self.formation_templates.items():
            # Get all template positions (excluding goalkeeper)
            template_positions = []
            for role, positions in template.positions.items():
                if role != PlayerRole.GOALKEEPER:
                    template_positions.extend(positions)

            # Calculate minimum distance matching
            score = self._calculate_formation_score(
                player_positions, template_positions
            )

            if score < best_score and score < threshold:
                best_score = score
                best_match = formation_type

        return best_match

    def _calculate_formation_score(
        self,
        actual: List[Tuple[float, float]],
        template: List[Tuple[float, float]]
    ) -> float:
        """Calculate how well actual positions match template."""
        actual_arr = np.array(actual)
        template_arr = np.array(template)

        # Use Hungarian algorithm for optimal matching
        from scipy.optimize import linear_sum_assignment

        # Calculate distance matrix
        dist_matrix = np.sqrt(
            np.sum((actual_arr[:, np.newaxis] - template_arr) ** 2, axis=2)
        )

        # Find optimal assignment
        row_ind, col_ind = linear_sum_assignment(dist_matrix)
        total_distance = dist_matrix[row_ind, col_ind].sum()

        return total_distance / len(actual)

    def detect_patterns(
        self,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """
        Detect all tactical patterns in the given time window.

        Args:
            tracking_data: Player tracking data with positions
            events: List of events (passes, shots, etc.)
            time_window: (start_time, end_time) in seconds

        Returns:
            List of detected patterns with timestamps and details
        """
        detected = []

        for pattern in self.patterns:
            matches = self._check_pattern(
                pattern, tracking_data, events, time_window
            )
            detected.extend(matches)

        return detected

    def _check_pattern(
        self,
        pattern: TacticalPattern,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Check if a specific pattern occurs in the data."""
        matches = []
        rules = pattern.detection_rules

        # Filter events to time window
        window_events = [
            e for e in events
            if time_window[0] <= e.get('time', 0) <= time_window[1]
        ]

        # Sequence-based patterns
        if 'sequence' in rules:
            sequence_matches = self._detect_sequence(
                rules['sequence'], window_events
            )
            for match in sequence_matches:
                matches.append({
                    'pattern_id': pattern.id,
                    'name': pattern.name,
                    'name_cz': pattern.name_cz,
                    'category': pattern.category,
                    'severity': pattern.severity,
                    'time': match['start_time'],
                    'end_time': match['end_time'],
                    'events': match['events'],
                    'confidence': match.get('confidence', 0.8),
                })

        # Position-based patterns (require tracking data)
        if 'team_avg_position_y' in rules or 'compact_formation' in rules:
            position_matches = self._detect_position_pattern(
                pattern, tracking_data, time_window
            )
            matches.extend(position_matches)

        return matches

    def _detect_sequence(
        self,
        sequence: List[Dict],
        events: List[Dict]
    ) -> List[Dict]:
        """Detect event sequences."""
        matches = []

        for i, event in enumerate(events):
            if event.get('type') == sequence[0].get('event'):
                # Try to match remaining sequence
                match_events = [event]
                current_time = event.get('time', 0)
                matched = True

                for j, seq_item in enumerate(sequence[1:], 1):
                    # Look for next event in sequence
                    max_delta = seq_item.get('max_time_delta', 5.0)
                    found = False

                    for k in range(i + j, min(i + j + 10, len(events))):
                        next_event = events[k]
                        time_delta = next_event.get('time', 0) - current_time

                        if time_delta > max_delta:
                            break

                        if next_event.get('type') == seq_item.get('event'):
                            match_events.append(next_event)
                            current_time = next_event.get('time', 0)
                            found = True
                            break

                    if not found:
                        matched = False
                        break

                if matched:
                    matches.append({
                        'start_time': match_events[0].get('time', 0),
                        'end_time': match_events[-1].get('time', 0),
                        'events': match_events,
                        'confidence': 0.85,
                    })

        return matches

    def _detect_position_pattern(
        self,
        pattern: TacticalPattern,
        tracking_data: Dict[str, Any],
        time_window: Tuple[float, float]
    ) -> List[Dict]:
        """Detect patterns based on player positions."""
        # This would analyze tracking_data frames
        # Simplified implementation
        return []

    def get_patterns_by_category(self, category: str) -> List[TacticalPattern]:
        """Get all patterns of a specific category."""
        return [p for p in self.patterns if p.category == category]

    def get_mistake_patterns(self) -> List[TacticalPattern]:
        """Get all mistake/problem patterns."""
        return [
            p for p in self.patterns
            if 'mistake' in p.category or p.severity in ('warning', 'critical')
        ]
