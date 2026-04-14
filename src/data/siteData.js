export const SCANNER_LABELS = [
  "DEEP_LEARNING",
  "COMPUTER_VISION",
  "DATA_ANALYSIS",
  "NEURAL_NETWORKS",
  "PATTERN_RECOGNITION",
  "ALGORITHM_OPTIMIZATION"
];

export const TERMINAL_MESSAGES = [
  "Hello, Welcome!",
  "An Aspiring Machine Learning Engineer and Data Analyst.",
  "Great interest in Gundam and Macross.",
  "LINK ESTABLISHED to SDB-01_YOLOv11s",
  "ANALYZING TRAFFIC PATTERNS... | THREAT_LEVEL: NOMINAL",
  "NEURAL SYNC... | UNIT_STABILITY: 99.4%",
  "WELCOME, PILOT. [UNIT: GUNDAM_COMPLEX O.S.]",
  "ミッション進行中... (Japanese - Mission in progress...)",
  "システム同期完了。 (Japanese - System synchronization complete.)",
  "ターゲット・ロック！ (Japanese - Target Lock!)"
];

export const SYSTEM_BOOT_SEQUENCE = [
  "INIT_KERNEL(N_E_R_O_OS) // OK",
  "MOUNTING_NEURAL_LINK // OK",
  "LOADING_COMBAT_DATA_PROFILES // OK",
  "CHECKING_OPTICAL_SENSORS // OK",
  "BYPASSING_INHIBITORS // OVERRIDE",
  "ALL_SYSTEMS_NOMINAL"
];

export const SKILLS_ARRAY = [
  {
    category: "Languages",
    items: ["Python", "C++", "C#", "Java", "HTML", "CSS", "SQL", "JavaScript"]
  },
  {
    category: "Tools & Platforms",
    items: ["Jupyter Notebook", "AWS SageMaker", "TensorBoard", "KNIME", "Google Colab", "Android Studio", "Visual Studio Code", "Unity", "Git", "GitHub", "Figma", "Canva", "Adobe Creative Suite", "Microsoft Office", "Tableau"]
  },
  {
    category: "Libraries",
    items: ["PyTorch", "Scikit-learn", "TensorFlow", "OpenCV", "Matplotlib", "Ultralytics", "Roboflow", "NumPy"]
  }
];

export const PROJECTS_ARRAY = [
  {
    id: "proj_01",
    title: "Detection of dangerous objects in airport security",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Developed YOLOv11s object detection model in Python. Automates identification of prohibited items in X-ray baggage. Employed scaling/rotation augmentation. Achieved 0.918 mAP50 on test dataset.",
    repoUrl: "#github-link-here",
    tags: ["YOLOv11s", "Python", "Computer Vision"],
    tacticalData: {
      THREAT_STATUS: "NOMINAL",
      MODEL_USED: "YOLOv11s",
      DATASET_SIZE: "3,500",
      KEY_METRIC: "0.918 mAP50"
    }
  },
  {
    id: "proj_02",
    title: "Binary classifier of whether it will rain the day after",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Analyzed >50k weather samples using KNIME/Python. Imputed, normalized, and one-hot encoded features. Evaluated Decision Trees, RF, KNN, XGBoost. Achieved 0.89 precision, 0.81 recall, 0.87 accuracy with a fine-tuned MLP.",
    repoUrl: "#github-link-here",
    tags: ["KNIME", "Python", "MLP", "XGBoost"],
    tacticalData: {
      THREAT_STATUS: "EVALUATING",
      MODEL_USED: "MLP / XGBoost",
      DATASET_SIZE: ">50,000",
      KEY_METRIC: "0.89 Precision"
    }
  },
  {
    id: "proj_03",
    title: "Binary image classifier of artificially generated images",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Developed real-time YOLOv11l classification model to distinguish authentic from synthetic images. Improved generalization via targeted augmentation. Achieved unified 0.73 Precision, Recall, and Accuracy.",
    repoUrl: "#github-link-here",
    tags: ["YOLOv11l", "Classification", "Deep Learning"],
    tacticalData: {
      THREAT_STATUS: "WARNING",
      MODEL_USED: "YOLOv11l",
      DATASET_SIZE: "15,000",
      KEY_METRIC: "0.73 Accuracy"
    }
  },
  {
    id: "proj_04",
    title: "Anti-social driving behaviour detection",
    date: "February 2025 - June 2025",
    status: "MISSION_ACTIVE",
    details: "CNN/YOLOv12s deep learning system classifying illegal U-turns/swerving. Applied Gaussian/Savitzky-Golay filtering for noisy tracking data. Trained on 20,000 images. YOLOv12s achieved mAP50-95 of 0.893. Behavioural classifier achieved 0.86 precision.",
    repoUrl: "#github-link-here",
    tags: ["YOLOv12s", "CNN", "Tracking"],
    tacticalData: {
      THREAT_STATUS: "ACTIVE_TRACKING",
      MODEL_USED: "YOLOv12s",
      DATASET_SIZE: "20,000",
      KEY_METRIC: "0.893 mAP50-95"
    }
  },
  {
    id: "proj_05",
    title: "Illegal Parking Detection",
    date: "February 2025 - June 2025",
    status: "MISSION_ACTIVE",
    details: "Two-stage CV system integrating road instance segmentation (YOLOv8l-seg) with vehicle detection (YOLOv11s). Analyzes spatial relationships for complex violations (double parking, kerb alignment). Applied convex hull post-processing to refine masks.",
    repoUrl: "#github-link-here",
    tags: ["YOLOv8l-seg", "YOLOv11s", "Segmentation"],
    tacticalData: {
      THREAT_STATUS: "ACTIVE_TRACKING",
      MODEL_USED: "YOLOv8l-seg",
      DATASET_SIZE: "12,000",
      KEY_METRIC: "In Progress"
    }
  },
  {
    id: "proj_06",
    title: "Image Mean Opinion Score Regressor",
    date: "July 2025 - October 2025",
    status: "IN_QUEUE",
    details: "Developed EfficientNetB2 CNN for Image Quality Assessment (IQA). Custom regression head for MOS. Achieved PLCC of 0.83 and SROCC of 0.79.",
    repoUrl: "#github-link-here",
    tags: ["EfficientNetB2", "IQA", "Regression"],
    tacticalData: {
      THREAT_STATUS: "STANDBY",
      MODEL_USED: "EfficientNetB2",
      DATASET_SIZE: "PENDING",
      KEY_METRIC: "0.83 PLCC"
    }
  },
  {
    id: "proj_07",
    title: "Neural Synapse Visualizer v1.0",
    date: "October 2025 - December 2025",
    status: "MISSION_STANDBY",
    details: "Developing a 3D brain activity visualization tool using Three.js and Python backend. Maps real-time EEG data to interactive neural nodes. Implements dynamic heat-maps for cognitive load analysis.",
    repoUrl: "#github-link-here",
    tags: ["Three.js", "Python", "Bio-Informatics"],
    tacticalData: {
      THREAT_STATUS: "STANDBY",
      MODEL_USED: "Custom_Visualizer",
      DATASET_SIZE: "N/A",
      KEY_METRIC: "99.2% Sync"
    }
  },
  {
    id: "proj_08",
    title: "Autonomous Drone Swarm Pathfinding",
    date: "January 2026 - Present",
    status: "MISSION_ACTIVE",
    details: "Implementing Multi-Agent Reinforcement Learning (MARL) for collaborative navigation in complex urban environments. Utilizing PPO-based agents with shared attention mechanisms.",
    repoUrl: "#github-link-here",
    tags: ["MARL", "PPO", "Drones"],
    tacticalData: {
      THREAT_STATUS: "DEPLOYED",
      MODEL_USED: "MAPPO",
      DATASET_SIZE: "Sim_Environment",
      KEY_METRIC: "Zero Collision"
    }
  },
  {
    id: "proj_09",
    title: "Encrypted Data Stream Decryptor",
    date: "May 2026 - August 2026",
    status: "IN_QUEUE",
    details: "Research project focusing on Transformer-based architectures for identifying patterns in high-entropy encrypted streams. Evaluating vulnerability to pattern-based frequency analysis.",
    repoUrl: "#github-link-here",
    tags: ["Transformers", "CyberSec", "BERT"],
    tacticalData: {
      THREAT_STATUS: "ENCRYPTED",
      MODEL_USED: "BERT-T100",
      DATASET_SIZE: "TBD",
      KEY_METRIC: "TBD"
    }
  }
];
