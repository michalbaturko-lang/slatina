"""
Slatina AI Video Analyzer

Main analyzer module for processing sports videos and detecting events.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import uuid

import cv2
import numpy as np
import torch
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DetectedObject:
    """Detected object in a frame."""
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2
    track_id: Optional[int] = None


@dataclass
class DetectedEvent:
    """Detected event in the video."""
    event_type: str
    start_time: float
    end_time: Optional[float]
    confidence: float
    metadata: Dict[str, Any]


class PlayerTracker:
    """Track players across frames using DeepSORT."""

    def __init__(self):
        self.tracker = DeepSort(
            max_age=30,
            n_init=3,
            nms_max_overlap=0.7,
            max_cosine_distance=0.3,
            nn_budget=100,
        )

    def update(
        self, detections: List[DetectedObject], frame: np.ndarray
    ) -> List[DetectedObject]:
        """Update tracker with new detections."""
        if not detections:
            return []

        # Prepare detections for DeepSORT
        bboxes = []
        confidences = []
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            bboxes.append([x1, y1, x2 - x1, y2 - y1])  # Convert to xywh
            confidences.append(det.confidence)

        # Update tracker
        tracks = self.tracker.update_tracks(
            raw_detections=list(zip(bboxes, confidences)),
            frame=frame,
        )

        # Map tracks back to detections
        tracked_detections = []
        for track in tracks:
            if not track.is_confirmed():
                continue

            ltrb = track.to_ltrb()
            tracked_detections.append(
                DetectedObject(
                    class_id=0,  # Person
                    class_name="player",
                    confidence=track.det_conf if track.det_conf else 0.8,
                    bbox=(ltrb[0], ltrb[1], ltrb[2], ltrb[3]),
                    track_id=track.track_id,
                )
            )

        return tracked_detections


class BallDetector:
    """Detect ball in sports videos."""

    def __init__(self, sport: str = "football"):
        self.sport = sport
        # Ball detection thresholds vary by sport
        self.min_radius = 5
        self.max_radius = 50 if sport == "football" else 30

    def detect(self, frame: np.ndarray) -> Optional[Tuple[int, int, int]]:
        """
        Detect ball using Hough Circle Transform.
        Returns (x, y, radius) or None.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (9, 9), 2)

        # Detect circles
        circles = cv2.HoughCircles(
            gray,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=50,
            param1=100,
            param2=30,
            minRadius=self.min_radius,
            maxRadius=self.max_radius,
        )

        if circles is not None:
            circles = np.uint16(np.around(circles))
            # Return the most prominent circle
            x, y, r = circles[0][0]
            return (int(x), int(y), int(r))

        return None


class EventDetector:
    """Detect game events from tracking data."""

    def __init__(self, sport: str = "football"):
        self.sport = sport
        self.event_history: List[Dict] = []
        self.ball_positions: List[Tuple[int, int, float]] = []  # x, y, time
        self.player_positions: Dict[int, List[Tuple[int, int, float]]] = {}

    def update(
        self,
        frame_time: float,
        players: List[DetectedObject],
        ball_pos: Optional[Tuple[int, int, int]],
    ):
        """Update tracking data."""
        if ball_pos:
            self.ball_positions.append((ball_pos[0], ball_pos[1], frame_time))
            # Keep only last 5 seconds of data
            self.ball_positions = [
                p for p in self.ball_positions if frame_time - p[2] < 5
            ]

        for player in players:
            if player.track_id:
                if player.track_id not in self.player_positions:
                    self.player_positions[player.track_id] = []
                cx = (player.bbox[0] + player.bbox[2]) / 2
                cy = (player.bbox[1] + player.bbox[3]) / 2
                self.player_positions[player.track_id].append(
                    (cx, cy, frame_time)
                )
                # Keep only last 5 seconds
                self.player_positions[player.track_id] = [
                    p
                    for p in self.player_positions[player.track_id]
                    if frame_time - p[2] < 5
                ]

    def detect_events(self, frame_time: float) -> List[DetectedEvent]:
        """Analyze tracking data and detect events."""
        events = []

        # Detect shot (fast ball movement toward goal area)
        if self._detect_shot():
            events.append(
                DetectedEvent(
                    event_type="shot",
                    start_time=frame_time - 1,
                    end_time=frame_time,
                    confidence=0.75,
                    metadata={"ball_speed": self._calculate_ball_speed()},
                )
            )

        # Detect pass (ball movement between players)
        pass_event = self._detect_pass(frame_time)
        if pass_event:
            events.append(pass_event)

        # Detect player sprint
        sprint_event = self._detect_sprint(frame_time)
        if sprint_event:
            events.append(sprint_event)

        return events

    def _detect_shot(self) -> bool:
        """Detect if a shot occurred."""
        if len(self.ball_positions) < 5:
            return False

        speed = self._calculate_ball_speed()
        # High speed indicates a shot
        return speed > 100  # pixels per frame

    def _detect_pass(self, frame_time: float) -> Optional[DetectedEvent]:
        """Detect if a pass occurred."""
        if len(self.ball_positions) < 10:
            return None

        # Check if ball moved from one player to another
        # Simplified: check if ball trajectory changed direction
        positions = self.ball_positions[-10:]
        if len(positions) >= 10:
            # Calculate direction changes
            directions = []
            for i in range(1, len(positions)):
                dx = positions[i][0] - positions[i - 1][0]
                dy = positions[i][1] - positions[i - 1][1]
                directions.append((dx, dy))

            # Check for significant direction change
            for i in range(len(directions) - 1):
                d1 = directions[i]
                d2 = directions[i + 1]
                dot = d1[0] * d2[0] + d1[1] * d2[1]
                if dot < -0.5:  # Sharp direction change
                    return DetectedEvent(
                        event_type="pass",
                        start_time=frame_time - 0.5,
                        end_time=frame_time,
                        confidence=0.7,
                        metadata={},
                    )

        return None

    def _detect_sprint(self, frame_time: float) -> Optional[DetectedEvent]:
        """Detect if a player is sprinting."""
        for player_id, positions in self.player_positions.items():
            if len(positions) < 10:
                continue

            # Calculate player speed over last second
            recent = [p for p in positions if frame_time - p[2] < 1]
            if len(recent) < 5:
                continue

            total_distance = 0
            for i in range(1, len(recent)):
                dx = recent[i][0] - recent[i - 1][0]
                dy = recent[i][1] - recent[i - 1][1]
                total_distance += np.sqrt(dx**2 + dy**2)

            # High speed = sprint
            if total_distance > 150:  # Threshold for sprint
                return DetectedEvent(
                    event_type="sprint",
                    start_time=frame_time - 1,
                    end_time=frame_time,
                    confidence=0.8,
                    metadata={"player_id": player_id, "distance": total_distance},
                )

        return None

    def _calculate_ball_speed(self) -> float:
        """Calculate ball speed from recent positions."""
        if len(self.ball_positions) < 2:
            return 0

        total_speed = 0
        count = 0
        for i in range(1, min(5, len(self.ball_positions))):
            p1 = self.ball_positions[-i - 1]
            p2 = self.ball_positions[-i]
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            dt = p2[2] - p1[2]
            if dt > 0:
                speed = np.sqrt(dx**2 + dy**2) / dt
                total_speed += speed
                count += 1

        return total_speed / count if count > 0 else 0


class VideoAnalyzer:
    """Main video analyzer class."""

    def __init__(self, sport: str = "football"):
        self.sport = sport
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")

        # Initialize YOLO for person detection
        self.yolo = YOLO("yolov8n.pt")
        self.yolo.to(self.device)

        # Initialize components
        self.player_tracker = PlayerTracker()
        self.ball_detector = BallDetector(sport)
        self.event_detector = EventDetector(sport)

    def analyze_video(
        self,
        video_path: str,
        output_path: Optional[str] = None,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a video and return detected events.

        Args:
            video_path: Path to the video file
            output_path: Optional path to save annotated video
            progress_callback: Optional callback for progress updates

        Returns:
            Dictionary with analysis results
        """
        logger.info(f"Analyzing video: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info(f"Video: {width}x{height}, {fps} FPS, {total_frames} frames")

        # Output video writer if requested
        out = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        all_events: List[DetectedEvent] = []
        player_heatmap = np.zeros((height // 10, width // 10), dtype=np.float32)

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_time = frame_idx / fps

            # Run YOLO detection every N frames for efficiency
            if frame_idx % 3 == 0:
                results = self.yolo(frame, classes=[0], verbose=False)  # Person class

                detections = []
                for r in results:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().item()
                        detections.append(
                            DetectedObject(
                                class_id=0,
                                class_name="person",
                                confidence=conf,
                                bbox=(x1, y1, x2, y2),
                            )
                        )

                # Update tracker
                tracked_players = self.player_tracker.update(detections, frame)

                # Detect ball
                ball_pos = self.ball_detector.detect(frame)

                # Update event detector
                self.event_detector.update(frame_time, tracked_players, ball_pos)

                # Detect events
                events = self.event_detector.detect_events(frame_time)
                all_events.extend(events)

                # Update heatmap
                for player in tracked_players:
                    cx = int((player.bbox[0] + player.bbox[2]) / 2) // 10
                    cy = int((player.bbox[1] + player.bbox[3]) / 2) // 10
                    if 0 <= cy < player_heatmap.shape[0] and 0 <= cx < player_heatmap.shape[1]:
                        player_heatmap[cy, cx] += 1

                # Draw annotations if output requested
                if out:
                    annotated_frame = self._draw_annotations(
                        frame, tracked_players, ball_pos, events
                    )
                    out.write(annotated_frame)

            frame_idx += 1

            # Progress callback
            if progress_callback and frame_idx % 100 == 0:
                progress = frame_idx / total_frames
                progress_callback(progress)

        cap.release()
        if out:
            out.release()

        # Merge overlapping events
        merged_events = self._merge_events(all_events)

        # Normalize heatmap
        if player_heatmap.max() > 0:
            player_heatmap = player_heatmap / player_heatmap.max()

        return {
            "video_path": video_path,
            "duration": total_frames / fps,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "events": [asdict(e) for e in merged_events],
            "statistics": {
                "total_events": len(merged_events),
                "events_by_type": self._count_events_by_type(merged_events),
            },
            "heatmap": player_heatmap.tolist(),
        }

    def _draw_annotations(
        self,
        frame: np.ndarray,
        players: List[DetectedObject],
        ball_pos: Optional[Tuple[int, int, int]],
        events: List[DetectedEvent],
    ) -> np.ndarray:
        """Draw detection annotations on frame."""
        annotated = frame.copy()

        # Draw player boxes
        for player in players:
            x1, y1, x2, y2 = [int(c) for c in player.bbox]
            color = (0, 255, 0)  # Green
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            if player.track_id:
                cv2.putText(
                    annotated,
                    f"P{player.track_id}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    color,
                    2,
                )

        # Draw ball
        if ball_pos:
            cv2.circle(annotated, (ball_pos[0], ball_pos[1]), ball_pos[2], (0, 0, 255), 2)

        # Draw event labels
        y_offset = 30
        for event in events:
            cv2.putText(
                annotated,
                f"{event.event_type.upper()} ({event.confidence:.0%})",
                (10, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2,
            )
            y_offset += 25

        return annotated

    def _merge_events(
        self, events: List[DetectedEvent], time_threshold: float = 1.0
    ) -> List[DetectedEvent]:
        """Merge overlapping or nearby events of the same type."""
        if not events:
            return []

        # Sort by start time
        sorted_events = sorted(events, key=lambda e: e.start_time)
        merged = []

        current = sorted_events[0]
        for event in sorted_events[1:]:
            if (
                event.event_type == current.event_type
                and event.start_time - (current.end_time or current.start_time)
                < time_threshold
            ):
                # Merge events
                current = DetectedEvent(
                    event_type=current.event_type,
                    start_time=current.start_time,
                    end_time=event.end_time or event.start_time,
                    confidence=max(current.confidence, event.confidence),
                    metadata={**current.metadata, **event.metadata},
                )
            else:
                merged.append(current)
                current = event

        merged.append(current)
        return merged

    def _count_events_by_type(
        self, events: List[DetectedEvent]
    ) -> Dict[str, int]:
        """Count events by type."""
        counts: Dict[str, int] = {}
        for event in events:
            counts[event.event_type] = counts.get(event.event_type, 0) + 1
        return counts


# Lambda handler
def lambda_handler(event: Dict, context: Any) -> Dict:
    """AWS Lambda handler for video analysis."""
    import boto3

    s3 = boto3.client("s3")

    video_id = event["video_id"]
    s3_bucket = event["bucket"]
    s3_key = event["key"]
    sport = event.get("sport", "football")

    # Download video from S3
    local_path = f"/tmp/{video_id}.mp4"
    s3.download_file(s3_bucket, s3_key, local_path)

    # Analyze video
    analyzer = VideoAnalyzer(sport=sport)
    results = analyzer.analyze_video(local_path)

    # Store results
    # In production, this would write to database and S3

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "video_id": video_id,
                "events_count": results["statistics"]["total_events"],
                "events": results["events"][:20],  # First 20 events
            }
        ),
    }


if __name__ == "__main__":
    # Test with a local video
    import sys

    if len(sys.argv) > 1:
        video_path = sys.argv[1]
        analyzer = VideoAnalyzer()
        results = analyzer.analyze_video(
            video_path, output_path="output_annotated.mp4"
        )
        print(json.dumps(results, indent=2, default=str))
