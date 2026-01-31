"""
Youth Football (Soccer) Specific AI Strategies

Zaměřeno na základní taktické prvky pro malé děti (U7-U12):
- Čtverec (rozestup)
- Nabídka (pohyb pro přihrávku)
- Přihrávka v útoku
- Obsazení protihráčů
- Rozehrávka od brankáře
- Standardní situace (rohy)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import numpy as np


class YouthAgeGroup(Enum):
    """Věkové kategorie mládeže."""
    U7 = "U7"   # Přípravka
    U9 = "U9"   # Přípravka
    U11 = "U11" # Mladší žáci
    U13 = "U13" # Starší žáci


class SkillLevel(Enum):
    """Úroveň obtížnosti pro výuku."""
    BASIC = "basic"       # Základní
    INTERMEDIATE = "intermediate"  # Střední
    ADVANCED = "advanced"  # Pokročilá


@dataclass
class YouthPattern:
    """Taktický vzor pro mládežnický fotbal."""
    id: str
    name: str
    name_cz: str
    description: str
    description_cz: str
    category: str
    age_groups: List[YouthAgeGroup]
    skill_level: SkillLevel
    severity: str  # 'positive', 'needs_work', 'critical'

    # Pro AI detekci
    detection_rules: Dict[str, Any]

    # Pro trenéry - co říct dětem
    coaching_points_cz: List[str] = field(default_factory=list)

    # Vizuální reference
    diagram_type: Optional[str] = None


# =============================================================================
# ČTVEREC (ROZESTUP) - Square/Spacing
# =============================================================================

SQUARE_PATTERNS: List[YouthPattern] = [
    YouthPattern(
        id="square_good",
        name="Good Square Formation",
        name_cz="Správný čtverec",
        description="Players maintaining good spacing to create passing options",
        description_cz="Hráči udržují správné rozestupy a vytvářejí přihrávkové možnosti",
        category="square",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="positive",
        detection_rules={
            "min_player_distance": 8.0,  # metrů od sebe
            "max_player_distance": 20.0,
            "players_spread_evenly": True,
            "formation_shape": "square_or_diamond",
            "duration": 3.0,  # sekund
        },
        coaching_points_cz=[
            "Výborně! Jste od sebe daleko, máte kam přihrát.",
            "Skvělý čtverec! Takto vytváříte prostor.",
            "Pamatujte: Když je míč u spoluhráče, roztáhněte se!",
        ],
        diagram_type="square_good",
    ),
    YouthPattern(
        id="square_bunching",
        name="Players Bunching Together",
        name_cz="Hráči na jednom místě (chumel)",
        description="Multiple players too close together, no spacing",
        description_cz="Hráči jsou příliš blízko u sebe, chybí rozestupy",
        category="square",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "players_within_radius": {
                "count": 3,  # 3 a více hráčů
                "radius": 5.0,  # v okruhu 5 metrů
            },
            "ball_nearby": True,
            "duration": 2.0,
        },
        coaching_points_cz=[
            "Rozběhněte se od sebe! Jste moc blízko.",
            "Čtverec! Vzpomeňte si - od sebe, od sebe!",
            "Kam má spoluhráč přihrát, když jste všichni na jednom místě?",
            "Představte si, že kolem sebe máte bublinu - nesmí se dotýkat!",
        ],
        diagram_type="square_bunching",
    ),
    YouthPattern(
        id="square_following_ball",
        name="All Players Following Ball",
        name_cz="Všichni běží za míčem",
        description="All players chasing the ball instead of maintaining positions",
        description_cz="Všichni hráči běží za míčem místo udržování pozic",
        category="square",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "all_players_moving_towards_ball": True,
            "team_centroid_near_ball": True,
            "no_player_in_space": True,
        },
        coaching_points_cz=[
            "Ne všichni za míčem! Jeden útočí, ostatní se rozběhnou.",
            "Kdo nemá míč, hledá volné místo!",
            "Vzpomeň si: míč má jen jeden, ostatní tvoří čtverec!",
        ],
        diagram_type="square_chasing",
    ),
]


# =============================================================================
# NABÍDKA (POHYB PRO PŘIHRÁVKU) - Offering/Movement
# =============================================================================

OFFER_PATTERNS: List[YouthPattern] = [
    YouthPattern(
        id="offer_good",
        name="Good Offering Movement",
        name_cz="Správná nabídka",
        description="Player moving into space to receive a pass",
        description_cz="Hráč se pohybuje do volného prostoru pro přijetí přihrávky",
        category="offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="positive",
        detection_rules={
            "player_movement": "towards_open_space",
            "passing_lane_clear": True,
            "player_facing_ball": True,
            "distance_from_ball_carrier": {"min": 5.0, "max": 15.0},
            "not_marked": True,
        },
        coaching_points_cz=[
            "Výborná nabídka! Šel jsi do volného prostoru.",
            "Skvěle! Ukázal jsi spoluhráči kam přihrát.",
            "Přesně tak - pohyb, nabídka, přihrávka!",
        ],
        diagram_type="offer_good",
    ),
    YouthPattern(
        id="offer_standing_still",
        name="Standing Still - No Offer",
        name_cz="Stojí na místě - chybí nabídka",
        description="Player standing still when teammate has the ball",
        description_cz="Hráč stojí na místě když spoluhráč má míč",
        category="offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "player_stationary": True,
            "teammate_has_ball": True,
            "duration": 3.0,
            "player_not_marked": True,  # mohl by se nabídnout
        },
        coaching_points_cz=[
            "Pohni se! Nabídni se spoluhráči!",
            "Stojíš - kam ti má přihrát? Běž do volna!",
            "Bez míče se POHYBUJ! Hledej prostor!",
            "Řekni si o míč - zavolej a naběhni!",
        ],
        diagram_type="offer_static",
    ),
    YouthPattern(
        id="offer_behind_defender",
        name="Hiding Behind Defender",
        name_cz="Schovaný za obráncem",
        description="Player positioned behind a defender, can't receive pass",
        description_cz="Hráč stojí za obráncem, nemůže přijmout přihrávku",
        category="offer",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="needs_work",
        detection_rules={
            "defender_between_player_and_ball": True,
            "passing_lane_blocked": True,
            "player_not_moving": True,
        },
        coaching_points_cz=[
            "Jsi schovaný za obráncem! Vykroč do strany.",
            "Ukaž se! Musíš být vidět pro spoluhráče.",
            "Pohni se tak, aby tě viděl - vlevo nebo vpravo od obránce.",
        ],
        diagram_type="offer_hidden",
    ),
    YouthPattern(
        id="offer_calling_for_ball",
        name="Calling and Moving for Ball",
        name_cz="Volání a náběh pro míč",
        description="Player verbally calling and moving to receive",
        description_cz="Hráč volá a nabíhá pro přijetí míče",
        category="offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="positive",
        detection_rules={
            "player_moving_towards_space": True,
            "hand_raised": True,  # pokud je detekce možná
            "audio_call": True,   # pokud je detekce možná
            "timing_with_ball_carrier": True,
        },
        coaching_points_cz=[
            "Výborně! Zavolal jsi a naběhl - to je správně!",
            "Skvělá komunikace! Takto si říkáš o míč.",
        ],
        diagram_type="offer_call",
    ),
]


# =============================================================================
# PŘIHRÁVKA V ÚTOKU (UVOLNĚNÍ) - Attacking Pass
# =============================================================================

ATTACKING_PASS_PATTERNS: List[YouthPattern] = [
    YouthPattern(
        id="pass_to_space",
        name="Pass Into Space",
        name_cz="Přihrávka do prostoru",
        description="Passing ahead of teammate for them to run onto",
        description_cz="Přihrávka před spoluhráče, aby si pro ni naběhl",
        category="attacking_pass",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "pass_direction": "forward",
            "pass_ahead_of_receiver": True,
            "receiver_running_onto_ball": True,
            "space_behind_defense": True,
        },
        coaching_points_cz=[
            "Výborná přihrávka do prostoru! Spoluhráč si naběhl.",
            "Skvěle! Přihrál jsi tam, kam běží, ne tam, kde stojí.",
        ],
        diagram_type="pass_space",
    ),
    YouthPattern(
        id="pass_release_teammate",
        name="Pass to Release Teammate",
        name_cz="Přihrávka pro uvolnění spoluhráče",
        description="Quick pass that allows teammate to break free",
        description_cz="Rychlá přihrávka, která umožní spoluhráči utéct",
        category="attacking_pass",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "sequence": [
                {"event": "pass", "timing": "early"},
                {"event": "receiver_accelerates", "max_time_delta": 1.0},
                {"event": "receiver_ahead_of_defender", "max_time_delta": 2.0},
            ],
        },
        coaching_points_cz=[
            "Výborně! Rychlou přihrávkou jsi ho uvolnil.",
            "Skvělé načasování! Přihrál jsi ve správný moment.",
        ],
        diagram_type="pass_release",
    ),
    YouthPattern(
        id="pass_too_slow",
        name="Pass Too Slow/Late",
        name_cz="Přihrávka moc pozdě",
        description="Holding ball too long, losing passing opportunity",
        description_cz="Držení míče příliš dlouho, ztráta možnosti přihrávky",
        category="attacking_pass",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "ball_possession_time": 5.0,  # sekund a více
            "passing_option_available": True,
            "passing_option_closed": True,  # po čekání se zavřela
        },
        coaching_points_cz=[
            "Rychleji! Měl jsi přihrát dřív, teď je tam obránce.",
            "Nezdrž míč - když vidíš volného spoluhráče, přihraj!",
            "První dotek - rozhlédni se, druhý - přihraj!",
        ],
        diagram_type="pass_late",
    ),
    YouthPattern(
        id="pass_wrong_foot",
        name="Pass to Wrong Foot",
        name_cz="Přihrávka na špatnou nohu",
        description="Passing to teammate's weaker foot when better option available",
        description_cz="Přihrávka na slabší nohu spoluhráče",
        category="attacking_pass",
        age_groups=[YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.ADVANCED,
        severity="needs_work",
        detection_rules={
            "pass_to_weak_foot": True,
            "better_angle_available": True,
        },
        coaching_points_cz=[
            "Zkus přihrát na lepší nohu spoluhráče.",
            "Přemýšlej kam přihráváš - na kterou nohu to bude lepší?",
        ],
        diagram_type="pass_foot",
    ),
]


# =============================================================================
# OBSAZENÍ PROTIHRÁČŮ (BRÁNĚNÍ) - Marking/Defending
# =============================================================================

MARKING_PATTERNS: List[YouthPattern] = [
    YouthPattern(
        id="marking_good",
        name="Good Man Marking",
        name_cz="Správné obsazení hráče",
        description="Defender staying close to opponent, ball-side position",
        description_cz="Obránce drží soupeře, je mezi ním a míčem",
        category="marking",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "defender_distance_to_opponent": {"max": 2.0},
            "defender_ball_side": True,
            "defender_can_see_ball_and_man": True,
        },
        coaching_points_cz=[
            "Výborně! Držíš ho a vidíš míč.",
            "Správná pozice - jsi mezi ním a míčem.",
            "Skvělé obsazení! Nemůže přijmout přihrávku.",
        ],
        diagram_type="marking_good",
    ),
    YouthPattern(
        id="marking_too_far",
        name="Marking Too Far From Opponent",
        name_cz="Příliš daleko od soupeře",
        description="Defender too far from assigned opponent",
        description_cz="Obránce je příliš daleko od svého hráče",
        category="marking",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "defender_distance_to_opponent": {"min": 5.0},
            "opponent_in_dangerous_zone": True,
            "ball_approaching": True,
        },
        coaching_points_cz=[
            "Přisuň se k němu! Jsi moc daleko.",
            "Drž ho! Když dostane míč, je volný.",
            "Zmenši vzdálenost - musíš být blíž!",
        ],
        diagram_type="marking_far",
    ),
    YouthPattern(
        id="marking_wrong_side",
        name="Wrong Side Marking",
        name_cz="Špatná strana při obsazení",
        description="Defender on wrong side, opponent between defender and ball",
        description_cz="Obránce na špatné straně, soupeř je mezi ním a míčem",
        category="marking",
        age_groups=[YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="needs_work",
        detection_rules={
            "opponent_between_defender_and_ball": True,
            "defender_ball_side": False,
        },
        coaching_points_cz=[
            "Špatná strana! Musíš být mezi ním a míčem.",
            "Přesuň se! On je blíž k míči než ty.",
            "Pamatuj: TY mezi NÍM a MÍČEM!",
        ],
        diagram_type="marking_wrongside",
    ),
    YouthPattern(
        id="marking_ball_watching",
        name="Ball Watching - Lost Opponent",
        name_cz="Koukání na míč - ztráta hráče",
        description="Defender watching ball, losing track of opponent",
        description_cz="Obránce kouká na míč a ztratil svého hráče",
        category="marking",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="critical",
        detection_rules={
            "defender_facing_ball": True,
            "opponent_behind_defender": True,
            "opponent_in_space": True,
            "defender_not_tracking": True,
        },
        coaching_points_cz=[
            "Ztratil jsi ho! Kontroluj míč I svého hráče!",
            "Nekoukej jen na míč - kde je tvůj hráč?",
            "Hlava na otočku: míč - hráč - míč - hráč!",
        ],
        diagram_type="marking_ballwatch",
    ),
    YouthPattern(
        id="no_one_marking",
        name="Opponent Unmarked",
        name_cz="Soupeř není obsazený",
        description="Opponent in dangerous position with no defender nearby",
        description_cz="Soupeř v nebezpečné pozici bez obránce",
        category="marking",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="critical",
        detection_rules={
            "opponent_in_dangerous_zone": True,
            "no_defender_within": 4.0,
            "ball_in_play": True,
        },
        coaching_points_cz=[
            "Kdo ho má?! Někdo ho musí vzít!",
            "Volný hráč! Běž k němu!",
            "Komunikace! Řekni si, kdo koho drží!",
        ],
        diagram_type="marking_none",
    ),
]


# =============================================================================
# NABÍDKA BRANKÁŘI (ROZEHRÁVKA) - Goalkeeper Distribution
# =============================================================================

GOALKEEPER_OFFER_PATTERNS: List[YouthPattern] = [
    YouthPattern(
        id="gk_offer_good",
        name="Good Offer to Goalkeeper",
        name_cz="Správná nabídka brankáři",
        description="Players spreading out to give goalkeeper passing options",
        description_cz="Hráči se roztáhnou a dají brankáři možnosti přihrávky",
        category="goalkeeper_offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="positive",
        detection_rules={
            "goalkeeper_has_ball": True,
            "players_spread_wide": True,
            "passing_lanes_open": {"count": 2},  # min 2 možnosti
            "players_facing_goalkeeper": True,
        },
        coaching_points_cz=[
            "Výborně! Roztáhli jste se, brankář má kam přihrát.",
            "Skvělá nabídka! Každý na svém místě.",
            "Tak je to správně - široce a ukázat se!",
        ],
        diagram_type="gk_offer_good",
    ),
    YouthPattern(
        id="gk_offer_bunched",
        name="No Offer to Goalkeeper - Bunched",
        name_cz="Chybí nabídka brankáři - chumel",
        description="Players bunched together, goalkeeper has no options",
        description_cz="Hráči jsou na jednom místě, brankář nemá kam přihrát",
        category="goalkeeper_offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "goalkeeper_has_ball": True,
            "players_bunched": True,
            "passing_lanes_blocked": True,
            "duration": 3.0,
        },
        coaching_points_cz=[
            "Roztáhněte se! Brankář nemá kam přihrát!",
            "Široce! Každý na svou stranu!",
            "Čtverec od brankáře - nabídněte se!",
        ],
        diagram_type="gk_offer_bunched",
    ),
    YouthPattern(
        id="gk_offer_hiding",
        name="Hiding From Goalkeeper",
        name_cz="Schovaný před brankářem",
        description="Player hiding behind opponent, can't receive from goalkeeper",
        description_cz="Hráč schovaný za soupeřem, nemůže přijmout od brankáře",
        category="goalkeeper_offer",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="needs_work",
        detection_rules={
            "goalkeeper_has_ball": True,
            "opponent_blocking_player": True,
            "player_not_moving_to_open": True,
        },
        coaching_points_cz=[
            "Ukaž se brankáři! Vykroč do strany.",
            "Jsi schovaný - pohni se tak, aby tě viděl!",
        ],
        diagram_type="gk_offer_hidden",
    ),
    YouthPattern(
        id="gk_offer_too_close",
        name="Too Close to Goalkeeper",
        name_cz="Příliš blízko k brankáři",
        description="Players too close to goalkeeper, not creating space",
        description_cz="Hráči příliš blízko brankáře, nevytvářejí prostor",
        category="goalkeeper_offer",
        age_groups=[YouthAgeGroup.U7, YouthAgeGroup.U9],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "goalkeeper_has_ball": True,
            "players_within_distance": {"distance": 8.0, "count": 2},
        },
        coaching_points_cz=[
            "Dál od brankáře! Jste moc blízko.",
            "Rozeběhněte se do hřiště - vytvořte prostor!",
        ],
        diagram_type="gk_offer_close",
    ),
]


# =============================================================================
# STANDARDNÍ SITUACE - ROHY (CORNERS)
# =============================================================================

CORNER_PATTERNS: List[YouthPattern] = [
    # ÚTOK - Attacking corners
    YouthPattern(
        id="corner_attack_positions",
        name="Good Corner Attack Positioning",
        name_cz="Správné rozestavení při útočném rohu",
        description="Players in correct positions for attacking corner",
        description_cz="Hráči na správných místech při útočném rohu",
        category="corner_attack",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "situation": "corner_kick_attacking",
            "player_at_near_post": True,
            "player_at_far_post": True,
            "player_at_penalty_spot": True,
            "player_at_edge_of_box": True,
        },
        coaching_points_cz=[
            "Výborné rozestavení! Každý ví, kam běžet.",
            "Správně - přední tyč, zadní tyč, penalta!",
        ],
        diagram_type="corner_attack_pos",
    ),
    YouthPattern(
        id="corner_attack_bunched",
        name="Corner Attack - Players Bunched",
        name_cz="Útočný roh - hráči na jednom místě",
        description="Attacking players bunched together at corner",
        description_cz="Útočící hráči na jednom místě při rohu",
        category="corner_attack",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11],
        skill_level=SkillLevel.BASIC,
        severity="needs_work",
        detection_rules={
            "situation": "corner_kick_attacking",
            "players_bunched_in_box": True,
        },
        coaching_points_cz=[
            "Rozestup! Každý na své místo!",
            "Pamatujte si pozice: přední tyč, zadní tyč, penalta!",
            "Nemačkejte se - roztáhněte se po vápně!",
        ],
        diagram_type="corner_attack_bunch",
    ),
    YouthPattern(
        id="corner_attack_run_near",
        name="Near Post Run",
        name_cz="Náběh na přední tyč",
        description="Player making run to near post for flick",
        description_cz="Hráč nabíhá na přední tyč pro teč",
        category="corner_attack",
        age_groups=[YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "situation": "corner_kick_attacking",
            "player_running_to_near_post": True,
            "timing_with_kick": True,
        },
        coaching_points_cz=[
            "Výborný náběh na přední tyč!",
            "Správné načasování - běžel jsi ve správný moment.",
        ],
        diagram_type="corner_near_run",
    ),

    # OBRANA - Defending corners
    YouthPattern(
        id="corner_defend_zonal",
        name="Good Zonal Corner Defense",
        name_cz="Správná zónová obrana rohu",
        description="Players covering key zones at defending corner",
        description_cz="Hráči pokrývají klíčové zóny při bránění rohu",
        category="corner_defend",
        age_groups=[YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.INTERMEDIATE,
        severity="positive",
        detection_rules={
            "situation": "corner_kick_defending",
            "near_post_covered": True,
            "far_post_covered": True,
            "goalkeeper_line_clear": True,
        },
        coaching_points_cz=[
            "Výborná zónová obrana!",
            "Správně - přední tyč, zadní tyč, prostor!",
        ],
        diagram_type="corner_def_zonal",
    ),
    YouthPattern(
        id="corner_defend_man",
        name="Good Man Marking at Corner",
        name_cz="Správné osobní bránění při rohu",
        description="Each defender marking assigned opponent",
        description_cz="Každý obránce drží přiděleného soupeře",
        category="corner_defend",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="positive",
        detection_rules={
            "situation": "corner_kick_defending",
            "each_attacker_marked": True,
            "defenders_goal_side": True,
        },
        coaching_points_cz=[
            "Výborně! Každý má svého hráče.",
            "Držte je! Buďte u nich těsně.",
        ],
        diagram_type="corner_def_man",
    ),
    YouthPattern(
        id="corner_defend_no_near_post",
        name="No One at Near Post",
        name_cz="Nikdo na přední tyči",
        description="Near post not covered at defending corner",
        description_cz="Přední tyč není pokrytá při bránění rohu",
        category="corner_defend",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="critical",
        detection_rules={
            "situation": "corner_kick_defending",
            "near_post_covered": False,
        },
        coaching_points_cz=[
            "Přední tyč! Někdo tam MUSÍ být!",
            "Kdo má přední tyč?! Rychle tam!",
        ],
        diagram_type="corner_def_no_near",
    ),
    YouthPattern(
        id="corner_defend_unmarked",
        name="Attacker Unmarked at Corner",
        name_cz="Neobsazený útočník při rohu",
        description="Attacking player unmarked in dangerous position",
        description_cz="Útočník není obsazený v nebezpečné pozici",
        category="corner_defend",
        age_groups=[YouthAgeGroup.U9, YouthAgeGroup.U11, YouthAgeGroup.U13],
        skill_level=SkillLevel.BASIC,
        severity="critical",
        detection_rules={
            "situation": "corner_kick_defending",
            "attacker_in_box_unmarked": True,
        },
        coaching_points_cz=[
            "Volný hráč! Kdo ho má?!",
            "Obsaďte ho! Je sám!",
            "Komunikace! Řekni kdo koho drží!",
        ],
        diagram_type="corner_def_unmarked",
    ),
]


# =============================================================================
# DETEKČNÍ ENGINE
# =============================================================================

class YouthFootballDetector:
    """
    Detektor taktických situací pro mládežnický fotbal.

    Zaměřený na jednoduché, srozumitelné situace pro děti.
    """

    def __init__(self, age_group: YouthAgeGroup = YouthAgeGroup.U9):
        self.age_group = age_group
        self.patterns = self._get_patterns_for_age_group(age_group)

    def _get_patterns_for_age_group(self, age_group: YouthAgeGroup) -> List[YouthPattern]:
        """Získá vzory vhodné pro danou věkovou kategorii."""
        all_patterns = (
            SQUARE_PATTERNS +
            OFFER_PATTERNS +
            ATTACKING_PASS_PATTERNS +
            MARKING_PATTERNS +
            GOALKEEPER_OFFER_PATTERNS +
            CORNER_PATTERNS
        )
        return [p for p in all_patterns if age_group in p.age_groups]

    def detect_patterns(
        self,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """
        Detekuje vzory v daném časovém okně.

        Args:
            tracking_data: Data o pozicích hráčů
            events: Seznam událostí (přihrávky, střely, atd.)
            time_window: (start, end) v sekundách

        Returns:
            Seznam detekovaných vzorů s časem a detaily
        """
        detected = []

        for pattern in self.patterns:
            matches = self._check_pattern(pattern, tracking_data, events, time_window)
            for match in matches:
                detected.append({
                    'pattern_id': pattern.id,
                    'name': pattern.name,
                    'name_cz': pattern.name_cz,
                    'category': pattern.category,
                    'severity': pattern.severity,
                    'coaching_points': pattern.coaching_points_cz,
                    'diagram_type': pattern.diagram_type,
                    **match
                })

        return detected

    def _check_pattern(
        self,
        pattern: YouthPattern,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Kontroluje, zda se daný vzor vyskytuje v datech."""
        matches = []
        rules = pattern.detection_rules

        # Kontrola shlukování hráčů (pro čtverec)
        if 'players_within_radius' in rules:
            bunching_matches = self._detect_bunching(
                tracking_data,
                rules['players_within_radius'],
                time_window
            )
            matches.extend(bunching_matches)

        # Kontrola rozestupů (pro správný čtverec)
        if 'min_player_distance' in rules:
            spacing_matches = self._detect_good_spacing(
                tracking_data,
                rules,
                time_window
            )
            matches.extend(spacing_matches)

        # Kontrola nabídky
        if pattern.category == 'offer':
            offer_matches = self._detect_offer_pattern(
                pattern, tracking_data, events, time_window
            )
            matches.extend(offer_matches)

        # Kontrola obsazení
        if pattern.category == 'marking':
            marking_matches = self._detect_marking_pattern(
                pattern, tracking_data, time_window
            )
            matches.extend(marking_matches)

        return matches

    def _detect_bunching(
        self,
        tracking_data: Dict[str, Any],
        rules: Dict[str, Any],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Detekuje shlukování hráčů (chumel)."""
        matches = []

        # Procházení framů v časovém okně
        frames = tracking_data.get('frames', [])
        for frame in frames:
            time = frame.get('time', 0)
            if not (time_window[0] <= time <= time_window[1]):
                continue

            players = frame.get('home_players', [])

            # Kontrola vzdáleností mezi hráči
            bunched_groups = self._find_bunched_players(
                players,
                rules['radius'],
                rules['count']
            )

            if bunched_groups:
                matches.append({
                    'time': time,
                    'confidence': 0.85,
                    'players_involved': bunched_groups,
                })

        return matches

    def _find_bunched_players(
        self,
        players: List[Dict],
        radius: float,
        min_count: int
    ) -> List[List[str]]:
        """Najde skupiny hráčů, kteří jsou příliš blízko u sebe."""
        groups = []

        for i, p1 in enumerate(players):
            nearby = [p1.get('id', str(i))]
            pos1 = np.array([p1.get('x', 0), p1.get('y', 0)])

            for j, p2 in enumerate(players):
                if i == j:
                    continue
                pos2 = np.array([p2.get('x', 0), p2.get('y', 0)])
                distance = np.linalg.norm(pos1 - pos2)

                if distance <= radius:
                    nearby.append(p2.get('id', str(j)))

            if len(nearby) >= min_count:
                # Přidej pouze pokud tato skupina ještě není v seznamu
                nearby_set = set(nearby)
                if not any(set(g) == nearby_set for g in groups):
                    groups.append(nearby)

        return groups

    def _detect_good_spacing(
        self,
        tracking_data: Dict[str, Any],
        rules: Dict[str, Any],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Detekuje správné rozestupy (čtverec)."""
        matches = []
        min_dist = rules.get('min_player_distance', 8.0)
        max_dist = rules.get('max_player_distance', 20.0)

        frames = tracking_data.get('frames', [])
        for frame in frames:
            time = frame.get('time', 0)
            if not (time_window[0] <= time <= time_window[1]):
                continue

            players = frame.get('home_players', [])
            if len(players) < 3:
                continue

            # Kontrola vzdáleností
            all_good = True
            distances = []

            for i, p1 in enumerate(players):
                pos1 = np.array([p1.get('x', 0), p1.get('y', 0)])
                for j, p2 in enumerate(players):
                    if i >= j:
                        continue
                    pos2 = np.array([p2.get('x', 0), p2.get('y', 0)])
                    dist = np.linalg.norm(pos1 - pos2)
                    distances.append(dist)

                    if dist < min_dist or dist > max_dist:
                        all_good = False

            if all_good and distances:
                matches.append({
                    'time': time,
                    'confidence': 0.9,
                    'avg_distance': np.mean(distances),
                })

        return matches

    def _detect_offer_pattern(
        self,
        pattern: YouthPattern,
        tracking_data: Dict[str, Any],
        events: List[Dict[str, Any]],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Detekuje vzory nabídky."""
        # Implementace závisí na konkrétním vzoru
        return []

    def _detect_marking_pattern(
        self,
        pattern: YouthPattern,
        tracking_data: Dict[str, Any],
        time_window: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Detekuje vzory obsazení."""
        # Implementace závisí na konkrétním vzoru
        return []

    def get_patterns_by_category(self, category: str) -> List[YouthPattern]:
        """Získá všechny vzory dané kategorie."""
        return [p for p in self.patterns if p.category == category]

    def get_critical_patterns(self) -> List[YouthPattern]:
        """Získá vzory označené jako kritické."""
        return [p for p in self.patterns if p.severity == 'critical']

    def get_positive_patterns(self) -> List[YouthPattern]:
        """Získá pozitivní vzory (dobré příklady)."""
        return [p for p in self.patterns if p.severity == 'positive']

    def get_coaching_summary(self, detected: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Vytvoří shrnutí pro trenéra z detekovaných vzorů.

        Returns:
            Slovník s kategorizovanými body pro trenéra
        """
        summary = {
            'positives': [],     # Co děti dělají dobře
            'needs_work': [],    # Na čem pracovat
            'critical': [],      # Kritické chyby k okamžité opravě
            'coaching_tips': [], # Tipy co říct dětem
        }

        for item in detected:
            if item['severity'] == 'positive':
                summary['positives'].append({
                    'name': item['name_cz'],
                    'time': item['time'],
                })
            elif item['severity'] == 'needs_work':
                summary['needs_work'].append({
                    'name': item['name_cz'],
                    'time': item['time'],
                    'tips': item.get('coaching_points', []),
                })
            elif item['severity'] == 'critical':
                summary['critical'].append({
                    'name': item['name_cz'],
                    'time': item['time'],
                    'tips': item.get('coaching_points', []),
                })

            # Přidej coaching tipy
            if item.get('coaching_points'):
                summary['coaching_tips'].extend(item['coaching_points'][:1])

        return summary


# =============================================================================
# HELPER FUNKCE PRO VIZUALIZACI
# =============================================================================

def get_diagram_svg(diagram_type: str) -> str:
    """
    Vrátí SVG diagram pro daný typ situace.

    Pro použití v UI jako vizuální pomůcka.
    """
    diagrams = {
        'square_good': '''
            <svg viewBox="0 0 100 100">
                <rect fill="#2a5a2a" width="100" height="100"/>
                <circle cx="20" cy="20" r="5" fill="#fff"/>
                <circle cx="80" cy="20" r="5" fill="#fff"/>
                <circle cx="20" cy="80" r="5" fill="#fff"/>
                <circle cx="80" cy="80" r="5" fill="#fff"/>
                <circle cx="50" cy="50" r="4" fill="#ff0"/>
                <text x="50" y="95" text-anchor="middle" fill="#fff" font-size="8">Správný čtverec</text>
            </svg>
        ''',
        'square_bunching': '''
            <svg viewBox="0 0 100 100">
                <rect fill="#2a5a2a" width="100" height="100"/>
                <circle cx="48" cy="48" r="5" fill="#fff"/>
                <circle cx="52" cy="52" r="5" fill="#fff"/>
                <circle cx="50" cy="45" r="5" fill="#fff"/>
                <circle cx="45" cy="50" r="5" fill="#fff"/>
                <circle cx="50" cy="50" r="4" fill="#ff0"/>
                <circle cx="50" cy="50" r="15" fill="none" stroke="#f00" stroke-width="2" stroke-dasharray="4"/>
                <text x="50" y="95" text-anchor="middle" fill="#f00" font-size="8">Chumel!</text>
            </svg>
        ''',
        # Další diagramy...
    }
    return diagrams.get(diagram_type, '')
