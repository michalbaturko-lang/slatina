"""
Feedback Learning Module

Collects and processes coach feedback to improve AI detection accuracy.
Implements continuous learning from verified annotations.
"""

import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class FeedbackItem:
    """A single feedback item from a coach."""
    event_id: str
    event_type: str
    is_correct: bool
    timestamp: float
    video_id: str
    team_id: str
    coach_id: str
    original_confidence: float
    metadata: Dict[str, Any]


@dataclass
class TrainingExample:
    """A training example for model improvement."""
    features: Dict[str, Any]
    label: str
    weight: float  # Importance weight based on feedback


class FeedbackCollector:
    """Collect and store feedback from coaches."""

    def __init__(self, db_connection=None):
        self.db = db_connection
        self.feedback_buffer: List[FeedbackItem] = []

    def add_feedback(
        self,
        event_id: str,
        event_type: str,
        is_correct: bool,
        timestamp: float,
        video_id: str,
        team_id: str,
        coach_id: str,
        original_confidence: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> FeedbackItem:
        """Add feedback for an AI-detected event."""
        feedback = FeedbackItem(
            event_id=event_id,
            event_type=event_type,
            is_correct=is_correct,
            timestamp=timestamp,
            video_id=video_id,
            team_id=team_id,
            coach_id=coach_id,
            original_confidence=original_confidence,
            metadata=metadata or {},
        )
        self.feedback_buffer.append(feedback)

        # If using database, save immediately
        if self.db:
            self._save_to_db(feedback)

        return feedback

    def get_feedback_stats(self, team_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about feedback."""
        items = self.feedback_buffer
        if team_id:
            items = [f for f in items if f.team_id == team_id]

        if not items:
            return {"total": 0, "accuracy": None, "by_type": {}}

        total = len(items)
        correct = sum(1 for f in items if f.is_correct)
        accuracy = correct / total if total > 0 else 0

        # Group by event type
        by_type: Dict[str, Dict[str, int]] = defaultdict(lambda: {"correct": 0, "incorrect": 0})
        for f in items:
            key = "correct" if f.is_correct else "incorrect"
            by_type[f.event_type][key] += 1

        return {
            "total": total,
            "correct": correct,
            "incorrect": total - correct,
            "accuracy": accuracy,
            "by_type": dict(by_type),
        }

    def _save_to_db(self, feedback: FeedbackItem):
        """Save feedback to database."""
        # Implementation depends on database setup
        pass


class ConfidenceCalibrator:
    """
    Calibrate detection confidence based on historical feedback.

    Uses Platt scaling to calibrate raw model outputs to true probabilities.
    """

    def __init__(self):
        self.calibration_params: Dict[str, Tuple[float, float]] = {}  # event_type -> (a, b)
        self.samples: Dict[str, List[Tuple[float, bool]]] = defaultdict(list)

    def add_sample(self, event_type: str, confidence: float, is_correct: bool):
        """Add a calibration sample."""
        self.samples[event_type].append((confidence, is_correct))

        # Recalibrate if we have enough samples
        if len(self.samples[event_type]) >= 50:
            self._calibrate(event_type)

    def calibrate_confidence(self, event_type: str, raw_confidence: float) -> float:
        """
        Apply calibration to a raw confidence score.

        Uses sigmoid function: calibrated = 1 / (1 + exp(a * raw + b))
        """
        if event_type not in self.calibration_params:
            return raw_confidence

        a, b = self.calibration_params[event_type]
        z = a * raw_confidence + b
        return 1 / (1 + np.exp(-z))

    def _calibrate(self, event_type: str):
        """Fit Platt scaling parameters using logistic regression."""
        samples = self.samples[event_type]
        if len(samples) < 20:
            return

        X = np.array([s[0] for s in samples]).reshape(-1, 1)
        y = np.array([1 if s[1] else 0 for s in samples])

        # Simple logistic regression via gradient descent
        a, b = 1.0, 0.0
        lr = 0.01

        for _ in range(1000):
            z = a * X.flatten() + b
            pred = 1 / (1 + np.exp(-z))

            # Gradient
            error = pred - y
            grad_a = np.mean(error * X.flatten())
            grad_b = np.mean(error)

            a -= lr * grad_a
            b -= lr * grad_b

        self.calibration_params[event_type] = (a, b)
        logger.info(f"Calibrated {event_type}: a={a:.3f}, b={b:.3f}")


class ActiveLearner:
    """
    Active learning for selecting most informative examples for labeling.

    Implements uncertainty sampling to prioritize events that need coach review.
    """

    def __init__(self, uncertainty_threshold: float = 0.3):
        self.uncertainty_threshold = uncertainty_threshold
        self.labeled_examples: Dict[str, List[TrainingExample]] = defaultdict(list)

    def should_request_label(self, event_type: str, confidence: float) -> bool:
        """
        Determine if we should request a label for this event.

        Uses uncertainty sampling: request label when model is uncertain.
        """
        uncertainty = 1 - abs(2 * confidence - 1)  # Max at 0.5 confidence
        return uncertainty > self.uncertainty_threshold

    def get_priority_events(
        self, events: List[Dict], max_count: int = 10
    ) -> List[Dict]:
        """
        Get events that would be most valuable to label.

        Prioritizes:
        1. Events with high uncertainty
        2. Event types with few labeled examples
        3. Recent events
        """
        scored_events = []

        for event in events:
            confidence = event.get("confidence", 0.5)
            event_type = event.get("event_type", "unknown")

            # Uncertainty score
            uncertainty = 1 - abs(2 * confidence - 1)

            # Scarcity score (fewer examples = higher priority)
            n_examples = len(self.labeled_examples.get(event_type, []))
            scarcity = 1 / (1 + n_examples / 10)

            # Combined priority score
            priority = 0.6 * uncertainty + 0.4 * scarcity

            scored_events.append((event, priority))

        # Sort by priority and return top N
        scored_events.sort(key=lambda x: x[1], reverse=True)
        return [e[0] for e in scored_events[:max_count]]

    def add_labeled_example(
        self,
        event_type: str,
        features: Dict[str, Any],
        label: str,
        importance: float = 1.0,
    ):
        """Add a labeled training example."""
        example = TrainingExample(
            features=features,
            label=label,
            weight=importance,
        )
        self.labeled_examples[event_type].append(example)


class PatternLearner:
    """
    Learn new patterns from coach annotations.

    Analyzes annotations to discover recurring situations and movements.
    """

    def __init__(self):
        self.annotation_clusters: Dict[str, List[Dict]] = defaultdict(list)

    def add_annotation(
        self,
        annotation_type: str,
        position_data: Dict[str, Any],
        video_metadata: Dict[str, Any],
    ):
        """Add an annotation for pattern learning."""
        self.annotation_clusters[annotation_type].append({
            "positions": position_data,
            "metadata": video_metadata,
        })

    def discover_patterns(
        self, min_occurrences: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Discover common patterns from annotations.

        Uses clustering to find recurring situations.
        """
        discovered = []

        for annotation_type, annotations in self.annotation_clusters.items():
            if len(annotations) < min_occurrences:
                continue

            # Extract position features
            position_features = []
            for ann in annotations:
                positions = ann.get("positions", {})
                if "points" in positions:
                    # Drawing annotation - extract centroid and extent
                    points = positions["points"]
                    if points:
                        xs = [p["x"] for p in points]
                        ys = [p["y"] for p in points]
                        position_features.append([
                            np.mean(xs),
                            np.mean(ys),
                            np.std(xs),
                            np.std(ys),
                        ])
                elif "startPoint" in positions:
                    # Shape annotation
                    start = positions["startPoint"]
                    end = positions.get("endPoint", start)
                    position_features.append([
                        start["x"],
                        start["y"],
                        end["x"],
                        end["y"],
                    ])

            if len(position_features) < min_occurrences:
                continue

            # Simple clustering: find mean position
            features_array = np.array(position_features)
            mean_position = features_array.mean(axis=0)
            std_position = features_array.std(axis=0)

            # Create pattern
            pattern = {
                "id": f"learned-{annotation_type}-{len(discovered)}",
                "name": f"Naučený vzor: {annotation_type}",
                "type": annotation_type,
                "centerPosition": {
                    "x": float(mean_position[0]),
                    "y": float(mean_position[1]),
                },
                "tolerance": float(max(std_position[:2]) * 2),
                "occurrences": len(position_features),
                "confidence": min(1.0, len(position_features) / 10),
            }
            discovered.append(pattern)

        return discovered


class FeedbackLearningPipeline:
    """
    Complete pipeline for learning from coach feedback.

    Combines all learning components to improve AI detection over time.
    """

    def __init__(self, team_id: str, db_connection=None):
        self.team_id = team_id
        self.feedback_collector = FeedbackCollector(db_connection)
        self.calibrator = ConfidenceCalibrator()
        self.active_learner = ActiveLearner()
        self.pattern_learner = PatternLearner()

    def process_feedback(
        self,
        event_id: str,
        event_type: str,
        is_correct: bool,
        confidence: float,
        video_id: str,
        coach_id: str,
        features: Optional[Dict[str, Any]] = None,
    ):
        """Process a single feedback item."""
        # Store feedback
        self.feedback_collector.add_feedback(
            event_id=event_id,
            event_type=event_type,
            is_correct=is_correct,
            timestamp=datetime.now().timestamp(),
            video_id=video_id,
            team_id=self.team_id,
            coach_id=coach_id,
            original_confidence=confidence,
        )

        # Update calibration
        self.calibrator.add_sample(event_type, confidence, is_correct)

        # Add to active learner
        if features:
            self.active_learner.add_labeled_example(
                event_type=event_type,
                features=features,
                label="correct" if is_correct else "incorrect",
            )

    def process_annotation(
        self,
        annotation_type: str,
        position_data: Dict[str, Any],
        video_metadata: Dict[str, Any],
    ):
        """Process a coach annotation for pattern learning."""
        self.pattern_learner.add_annotation(
            annotation_type, position_data, video_metadata
        )

    def get_calibrated_events(self, events: List[Dict]) -> List[Dict]:
        """Apply calibration to a list of events."""
        calibrated = []
        for event in events:
            event_copy = event.copy()
            raw_confidence = event.get("confidence", 0.5)
            event_type = event.get("event_type", "unknown")

            event_copy["confidence"] = self.calibrator.calibrate_confidence(
                event_type, raw_confidence
            )
            event_copy["raw_confidence"] = raw_confidence

            calibrated.append(event_copy)

        return calibrated

    def get_events_for_review(self, events: List[Dict]) -> List[Dict]:
        """Get events that should be reviewed by coaches."""
        return self.active_learner.get_priority_events(events)

    def get_learned_patterns(self) -> List[Dict]:
        """Get patterns discovered from annotations."""
        return self.pattern_learner.discover_patterns()

    def get_statistics(self) -> Dict[str, Any]:
        """Get learning statistics."""
        return {
            "feedback": self.feedback_collector.get_feedback_stats(self.team_id),
            "calibration": {
                event_type: {"a": params[0], "b": params[1]}
                for event_type, params in self.calibrator.calibration_params.items()
            },
            "learned_patterns": len(self.pattern_learner.discover_patterns()),
        }
