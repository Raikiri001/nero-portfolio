import { useState, useEffect, useRef } from 'react';
import './DataStream.css';

const DETECTION_LABELS = [
  'DATA_NODE_01', 'TARGET_CONFIRMED', 'SIGNAL_TRACE',
  'OBJECT_DET_α', 'NEURAL_NET_02', 'CV_PIPELINE',
  'YOLO_DETECT', 'BBOX_LOCKED', 'TENSOR_FLOW',
  'FEATURE_MAP', 'CONV_LAYER_3', 'INFERENCE_OK',
];

const STREAM_DATA = [
  '> init_pipeline(yolov8_model, conf=0.85)',
  '> loading weights... [████████████░░] 87%',
  '> input_tensor: shape=(1, 3, 640, 640)',
  '> NMS threshold: 0.45 // IoU: 0.7',
  '> detection_count: 14 objects',
  '> class_distribution: {person: 5, vehicle: 7, signal: 2}',
  '> avg_inference_time: 12.3ms @ RTX4090',
  '> mAP@0.5: 0.942 // mAP@0.5:0.95: 0.781',
  '> frame_buffer: 60fps STABLE',
  '> > tracking_id: #0042 — CONFIRMED',
  '> kalman_filter.predict() → [x: 342, y: 198, w: 85, h: 120]',
  '> backbone: CSPDarknet53 // neck: PANet',
  '> deploy_edge: jetson_nano → ONNX_EXPORT',
  '> > epoch 150/200: loss=0.0234, val_loss=0.0189',
];

function DetectionBox({ label, style }) {
  return (
    <div className="detection-box" style={style}>
      <div className="detection-box__corner detection-box__corner--tl" />
      <div className="detection-box__corner detection-box__corner--tr" />
      <div className="detection-box__corner detection-box__corner--bl" />
      <div className="detection-box__corner detection-box__corner--br" />
      <span className="detection-box__label">{label}</span>
    </div>
  );
}

export function DataStream() {
  const [boxes, setBoxes] = useState([]);
  const [streamLines, setStreamLines] = useState([]);
  const streamRef = useRef(null);
  const lineIndexRef = useRef(0);

  // Animate detection boxes
  useEffect(() => {
    const spawnBox = () => {
      const box = {
        id: Date.now() + Math.random(),
        label: DETECTION_LABELS[Math.floor(Math.random() * DETECTION_LABELS.length)],
        x: 10 + Math.random() * 70,
        y: 5 + Math.random() * 60,
        w: 60 + Math.random() * 80,
        h: 25 + Math.random() * 35,
      };
      setBoxes(prev => [...prev.slice(-5), box]); // Keep max 6 boxes
    };

    spawnBox();
    const interval = setInterval(spawnBox, 2000);
    return () => clearInterval(interval);
  }, []);

  // Scrolling data stream
  useEffect(() => {
    const interval = setInterval(() => {
      const line = STREAM_DATA[lineIndexRef.current % STREAM_DATA.length];
      setStreamLines(prev => [...prev.slice(-8), line]);
      lineIndexRef.current++;
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="data-stream">
      <div className="data-stream__header">
        <span className="data-stream__icon">◆</span>
        <span>LIVE_RESEARCH_FEED — OBJECT DETECTION PIPELINE</span>
        <span className="data-stream__status">● ACTIVE</span>
      </div>
      <div className="data-stream__content">
        {/* Detection visualizer */}
        <div className="data-stream__visualizer">
          {boxes.map(box => (
            <DetectionBox
              key={box.id}
              label={box.label}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}px`,
                height: `${box.h}px`,
              }}
            />
          ))}
        </div>
        {/* Terminal stream */}
        <div className="data-stream__terminal" ref={streamRef}>
          {streamLines.map((line, i) => (
            <div key={i} className="stream-line">
              <span className="stream-line__timestamp">{String(i).padStart(4, '0')}</span>
              <span className="stream-line__content">{line}</span>
            </div>
          ))}
          <span className="neural-cursor">█</span>
        </div>
      </div>
    </div>
  );
}
