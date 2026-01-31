"""
Ice Hockey Specific AI Strategies

Contains predefined patterns, formations, and tactical situations
for automatic detection in hockey game videos.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np


class HockeyFormationType(Enum):
    """Standard hockey formations."""
    # Offensive zone
    UMBRELLA = "umbrella"  # Power play
    OVERLOAD = "overload"  # Power play
    ONE_THREE_ONE = "1-3-1"  # Power play
    # Defensive zone
    BOX = "box"  # Penalty kill
    DIAMOND = "diamond"  # Penalty kill
    PASSIVE_BOX = "passive_box"
    # Neutral zone
    LEFT_WING_LOCK = "left_wing_lock"
    NEUTRAL_ZONE_TRAP = "trap"
    FORECHECK_1_2_2 = "1-2-2"
    FORECHECK_2_1_2 = "2-1-2"


class HockeyPosition(Enum):
    """Player positions in hockey."""
    GOALIE = "goalie"
    LEFT_DEFENSE = "left_defense"
    RIGHT_DEFENSE = "right_defense"
    CENTER = "center"
    LEFT_WING = "left_wing"
    RIGHT_WING = "right_wing"


class ZoneType(Enum):
    """Ice zones."""
    OFFENSIVE = "offensive"
    NEUTRAL = "neutral"
    DEFENSIVE = "defensive"


@dataclass
class HockeyPattern:
    """A tactical pattern for hockey."""
    id: str
    name: str
    name_cz: str
    description: str
    category: str
    severity: str
    zone: Optional[ZoneType]
    detection_rules: Dict[str, Any]


# =============================================================================
# OFFENSIVE PATTERNS
# =============================================================================

OFFENSIVE_PATTERNS: List[HockeyPattern] = [
    HockeyPattern(
        id="cycle_play",
        name="Cycle Play",
        name_cz="Hra za brankou (cyklus)",
        description="Puck cycling behind the net to create scoring chances",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "puck_zone": "behind_net",
            "puck_movement": "circular",
            "duration": 5.0,
            "passes": 3,
        }
    ),
    HockeyPattern(
        id="give_and_go",
        name="Give and Go",
        name_cz="Dvojice (přihraj a jeď)",
        description="Quick pass and skate to receive return pass",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "sequence": [
                {"event": "pass", "player": "A"},
                {"event": "pass", "player": "B", "max_time_delta": 2.0},
            ],
            "receiver_same_as_first_passer": True,
            "first_passer_moved_forward": True,
        }
    ),
    HockeyPattern(
        id="slot_pass",
        name="Pass to Slot",
        name_cz="Přihrávka do slotu",
        description="Pass into the high-danger scoring area",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "pass_target": "slot",
            "from_zone": ["behind_net", "corner", "half_wall"],
        }
    ),
    HockeyPattern(
        id="one_timer",
        name="One-Timer",
        name_cz="Střela z první",
        description="Shot taken directly from a pass without stopping the puck",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "sequence": [
                {"event": "pass"},
                {"event": "shot", "max_time_delta": 0.5},
            ],
            "no_puck_control": True,
        }
    ),
    HockeyPattern(
        id="backdoor_play",
        name="Backdoor Play",
        name_cz="Hra na zadní tyč",
        description="Pass across the crease to the far side",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "pass_type": "cross_crease",
            "receiver_position": "far_post",
            "shot_opportunity": True,
        }
    ),
    HockeyPattern(
        id="rush_2_on_1",
        name="2-on-1 Rush",
        name_cz="Přečíslení 2 na 1",
        description="Two attackers against one defender",
        category="offensive",
        severity="info",
        zone=ZoneType.NEUTRAL,
        detection_rules={
            "attackers_with_puck": 2,
            "defenders_in_zone": 1,
            "goalie_excluded": True,
            "zone_entry": True,
        }
    ),
    HockeyPattern(
        id="rush_3_on_2",
        name="3-on-2 Rush",
        name_cz="Přečíslení 3 na 2",
        description="Three attackers against two defenders",
        category="offensive",
        severity="info",
        zone=ZoneType.NEUTRAL,
        detection_rules={
            "attackers_with_puck": 3,
            "defenders_in_zone": 2,
            "goalie_excluded": True,
            "zone_entry": True,
        }
    ),
    HockeyPattern(
        id="breakaway",
        name="Breakaway",
        name_cz="Samostatný nájezd",
        description="Single attacker with clear path to goal",
        category="offensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "attackers_ahead_of_defenders": 1,
            "no_defender_between_puck_and_goal": True,
            "puck_carrier_moving_towards_goal": True,
        }
    ),
]


# =============================================================================
# DEFENSIVE PATTERNS
# =============================================================================

DEFENSIVE_PATTERNS: List[HockeyPattern] = [
    HockeyPattern(
        id="forecheck_aggressive",
        name="Aggressive Forecheck",
        name_cz="Agresivní forčeking",
        description="First forward pressures puck carrier hard",
        category="defensive",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "f1_distance_to_puck": 3.0,  # meters max
            "f1_closing_speed": 5.0,  # m/s min
            "support_players_positioned": True,
        }
    ),
    HockeyPattern(
        id="neutral_zone_trap",
        name="Neutral Zone Trap",
        name_cz="Past v neutrálním pásmu",
        description="Defensive formation to clog the neutral zone",
        category="defensive",
        severity="info",
        zone=ZoneType.NEUTRAL,
        detection_rules={
            "formation": "1-2-2",
            "gap_control": True,
            "stick_in_passing_lanes": True,
        }
    ),
    HockeyPattern(
        id="box_penalty_kill",
        name="Box Penalty Kill",
        name_cz="Box na oslabení",
        description="Box formation during penalty kill",
        category="defensive",
        severity="info",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "formation": "box",
            "situation": "penalty_kill",
            "players": 4,
        }
    ),
    HockeyPattern(
        id="shot_block",
        name="Shot Block",
        name_cz="Zblokovaná střela",
        description="Player blocks an opponent's shot",
        category="defensive",
        severity="info",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "event": "blocked_shot",
            "blocker_position": "shooting_lane",
        }
    ),
]


# =============================================================================
# MISTAKE PATTERNS
# =============================================================================

MISTAKE_PATTERNS: List[HockeyPattern] = [
    HockeyPattern(
        id="turnover_defensive_zone",
        name="Defensive Zone Turnover",
        name_cz="Ztráta v obranném pásmu",
        description="Losing the puck in the defensive zone",
        category="mistake",
        severity="critical",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "event": "turnover",
            "zone": "defensive",
            "results_in_shot": True,
        }
    ),
    HockeyPattern(
        id="pinch_gone_wrong",
        name="Failed Pinch",
        name_cz="Nepovedený pinch obránce",
        description="Defenseman pinches and opponent breaks out",
        category="mistake",
        severity="warning",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "player_position": HockeyPosition.LEFT_DEFENSE,
            "pinch_attempt": True,
            "puck_lost": True,
            "opponent_breakout": True,
        }
    ),
    HockeyPattern(
        id="man_uncovered_slot",
        name="Uncovered Man in Slot",
        name_cz="Nepokrytý hráč ve slotu",
        description="Opponent left unmarked in the slot area",
        category="mistake",
        severity="critical",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "opponent_in_slot": True,
            "no_defender_within": 2.0,  # meters
            "puck_in_offensive_zone": True,
        }
    ),
    HockeyPattern(
        id="bad_line_change",
        name="Bad Line Change",
        name_cz="Špatné střídání",
        description="Line change leading to odd-man rush",
        category="mistake",
        severity="warning",
        zone=None,
        detection_rules={
            "event": "line_change",
            "opponent_rush": True,
            "players_at_bench": True,
        }
    ),
    HockeyPattern(
        id="icing",
        name="Icing (Avoidable)",
        name_cz="Zbytečné zakázané uvolnění",
        description="Icing that could have been avoided",
        category="mistake",
        severity="info",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "event": "icing",
            "passing_option_available": True,
            "under_pressure": False,
        }
    ),
    HockeyPattern(
        id="backdoor_left_open",
        name="Backdoor Left Open",
        name_cz="Otevřená zadní tyč",
        description="Defender fails to cover backdoor pass option",
        category="mistake",
        severity="critical",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "opponent_at_far_post": True,
            "defender_focused_on_puck": True,
            "passing_lane_open": True,
        }
    ),
    HockeyPattern(
        id="goalie_out_of_position",
        name="Goalie Out of Position",
        name_cz="Brankář mimo pozici",
        description="Goaltender not properly positioned for the shot",
        category="mistake",
        severity="critical",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "goalie_angle": "poor",
            "goalie_depth": "incorrect",
            "shot_incoming": True,
        }
    ),
    HockeyPattern(
        id="too_many_men",
        name="Too Many Men Risk",
        name_cz="Riziko příliš mnoha hráčů",
        description="Nearly having too many men on ice during change",
        category="mistake",
        severity="warning",
        zone=None,
        detection_rules={
            "players_on_ice": 6,
            "during_line_change": True,
            "puck_in_play": True,
        }
    ),
]


# =============================================================================
# SPECIAL TEAMS PATTERNS
# =============================================================================

SPECIAL_TEAMS_PATTERNS: List[HockeyPattern] = [
    HockeyPattern(
        id="pp_umbrella_setup",
        name="Umbrella Power Play Setup",
        name_cz="Umbrella přesilová hra",
        description="Umbrella formation on power play",
        category="special_teams",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "situation": "power_play",
            "formation": "umbrella",
            "point_man_high": True,
            "two_flanks": True,
        }
    ),
    HockeyPattern(
        id="pp_one_timer_chance",
        name="Power Play One-Timer Chance",
        name_cz="Šance na střelu z první v přesilovce",
        description="One-timer opportunity created on power play",
        category="special_teams",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "situation": "power_play",
            "cross_ice_pass": True,
            "shooter_ready": True,
            "lane_open": True,
        }
    ),
    HockeyPattern(
        id="pk_clear",
        name="Penalty Kill Clear",
        name_cz="Vyhození v oslabení",
        description="Successfully clearing the puck during penalty kill",
        category="special_teams",
        severity="info",
        zone=ZoneType.DEFENSIVE,
        detection_rules={
            "situation": "penalty_kill",
            "event": "clear",
            "puck_exits_zone": True,
        }
    ),
    HockeyPattern(
        id="shorthanded_chance",
        name="Shorthanded Chance",
        name_cz="Šance v oslabení",
        description="Scoring chance while shorthanded",
        category="special_teams",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "situation": "penalty_kill",
            "shot_on_goal": True,
            "xg_threshold": 0.1,
        }
    ),
]


# =============================================================================
# FACE-OFF PATTERNS
# =============================================================================

FACEOFF_PATTERNS: List[HockeyPattern] = [
    HockeyPattern(
        id="faceoff_win_possession",
        name="Clean Face-off Win",
        name_cz="Čistě vyhraný buly",
        description="Face-off won with maintained possession",
        category="faceoff",
        severity="info",
        zone=None,
        detection_rules={
            "event": "faceoff",
            "result": "win",
            "possession_after": 3.0,  # seconds
        }
    ),
    HockeyPattern(
        id="faceoff_direct_shot",
        name="Face-off to Shot",
        name_cz="Buly přímo na střelu",
        description="Face-off play leading directly to shot",
        category="faceoff",
        severity="info",
        zone=ZoneType.OFFENSIVE,
        detection_rules={
            "event": "faceoff",
            "result": "win",
            "shot_within": 3.0,  # seconds
        }
    ),
]


# =============================================================================
# PATTERN DETECTOR
# =============================================================================

class HockeyPatternDetector:
    """Detects tactical patterns in hockey game data."""

    def __init__(self):
        self.patterns = (
            OFFENSIVE_PATTERNS +
            DEFENSIVE_PATTERNS +
            MISTAKE_PATTERNS +
            SPECIAL_TEAMS_PATTERNS +
            FACEOFF_PATTERNS
        )

    def detect_patterns(
        self,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float],
        game_state: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect patterns in the given time window.

        Args:
            tracking_data: Player and puck tracking data
            events: Game events (shots, passes, etc.)
            time_window: (start, end) times in seconds
            game_state: Current game state (score, period, penalties)

        Returns:
            List of detected patterns
        """
        detected = []

        # Filter events to time window
        window_events = [
            e for e in events
            if time_window[0] <= e.get('time', 0) <= time_window[1]
        ]

        # Check each pattern
        for pattern in self.patterns:
            # Skip special teams patterns if not in special teams situation
            if pattern.category == 'special_teams':
                if not game_state or not game_state.get('power_play'):
                    continue

            matches = self._check_pattern(pattern, tracking_data, window_events)
            for match in matches:
                detected.append({
                    'pattern_id': pattern.id,
                    'name': pattern.name,
                    'name_cz': pattern.name_cz,
                    'description': pattern.description,
                    'category': pattern.category,
                    'severity': pattern.severity,
                    'zone': pattern.zone.value if pattern.zone else None,
                    **match
                })

        return detected

    def _check_pattern(
        self,
        pattern: HockeyPattern,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Check if a specific pattern occurs."""
        matches = []
        rules = pattern.detection_rules

        # Sequence-based detection
        if 'sequence' in rules:
            matches.extend(self._detect_sequence(rules['sequence'], events))

        # Event-based detection
        if 'event' in rules:
            for event in events:
                if event.get('type') == rules['event']:
                    if self._check_event_conditions(event, rules):
                        matches.append({
                            'time': event.get('time', 0),
                            'confidence': 0.85,
                            'event': event,
                        })

        return matches

    def _detect_sequence(
        self,
        sequence: List[Dict],
        events: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Detect event sequences."""
        matches = []

        for i, event in enumerate(events):
            if event.get('type') == sequence[0].get('event'):
                match_events = [event]
                current_time = event.get('time', 0)
                matched = True

                for seq_item in sequence[1:]:
                    max_delta = seq_item.get('max_time_delta', 5.0)
                    found = False

                    for next_event in events[i + 1:]:
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
                        'time': match_events[0].get('time', 0),
                        'end_time': match_events[-1].get('time', 0),
                        'confidence': 0.85,
                        'events': match_events,
                    })

        return matches

    def _check_event_conditions(
        self,
        event: Dict[str, Any],
        rules: Dict[str, Any]
    ) -> bool:
        """Check if event meets additional conditions."""
        # Zone check
        if 'zone' in rules:
            if event.get('zone') != rules['zone']:
                return False

        return True

    def get_critical_mistakes(self) -> List[HockeyPattern]:
        """Get all critical mistake patterns."""
        return [
            p for p in self.patterns
            if p.severity == 'critical'
        ]

    def get_patterns_by_zone(self, zone: ZoneType) -> List[HockeyPattern]:
        """Get patterns for a specific zone."""
        return [p for p in self.patterns if p.zone == zone]
