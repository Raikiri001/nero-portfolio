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
  "I am an aspiring Machine Learning Engineer and Data Analyst.",
  "I major in AI and Data Analytics. I am specialised in Computer Vision.",
  "Hot take: Gundam SEED is the absolute best series in the franchise.",
  "In my opinion, the ZGMF-X20A Strike Freedom is the pinnacle of design.",
  "Macross Frontier is comfortably the best Macross series—no contest.",
  "Current focus: Building Gunpla by day and training AI models by night.",
  "Special thanks to Aidan R!",
  "Special thanks to Roshan K!",
  "Special thanks to Seni B!",
  "Special thanks to Ethan S!",
  "Special thanks to Alex W!",
  "Asian Kung-fu generation makes the best rock music ever!!!",
  "I find Object detection and Instance segmentation verty interesting!",
  "Developing and building Neural Networks is fun!",
  "I like to develop projects that have great social impact!",
  "I aim to use my experience and skills to help society!",
  "I am always open to new ideas and collaborations.",
  "Feel free to reach out to me if you have any questions or suggestions.",
  "The best Gunpla I have built so far is the MGEX Strike Freedom!",
  "I am always looking for new challenges and opportunities to learn.",
  "I am excited to see what the future holds!",
  "I hope you enjoy visiting my portfolio!",
  "Thank you for visiting my portfolio!",
  "I hope you have a great day!",
  "I have an interest in plastic modelling!"
];

export const SYSTEM_BOOT_SEQUENCE = [
  "MOUNTING_NEURO_LINK_GEN_UNILATERAL",
  "PHASE_SHIFT_ARMOR_ENERGIZED",
  "N_JAMMER_CANCELLER_ACTIVE",
  "SEED_FACTOR_TRIGGERED_OVERRIDE",
  "SYNCING_FOLD_WAVE_RECEPTORS_ENERGIZED",
  "FOLD_QUARTZ_STABILIZATION_ACTIVE",
  "CHECKING_EX-GEAR_INTERFACE_ACTIVE",
  "BYPASSING_SMS_INHIBITORS_DECULTURE",
  "ALL SYSTEMS NOMINAL"
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
    title: "Dangerous Object Detection In Airport Security X-Rays",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Developed YOLOv11s object detection model in Python. Automates identification of prohibited items in X-ray baggage. Employed scaling/rotation augmentation. Achieved 0.918 mAP50 on test dataset.",
    repoUrl: "",
    tags: ["YOLOv11s", "Python", "Computer Vision"],
    tacticalData: {
      OBJECTIVE: "OBJECT_DETECTION",
      MODEL_USED: "YOLOv11s",
      DATASET_SIZE: "3,500",
      KEY_METRIC: "0.918 mAP50"
    }
  },
  {
    id: "proj_02",
    title: "Will It Rain Tomorrow Binary Classifier",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Analyzed >50k weather samples using KNIME/Python. Imputed, normalized, and one-hot encoded features. Evaluated Decision Trees, RF, KNN, XGBoost. Achieved 0.89 precision, 0.81 recall, 0.87 accuracy with a fine-tuned MLP.",
    repoUrl: "",
    tags: ["KNIME", "Python", "MLP", "XGBoost"],
    tacticalData: {
      OBJECTIVE: "CLASSIFICATION",
      MODEL_USED: "MLP, Random Forest, KNN, XGBoost",
      DATASET_SIZE: "50,000",
      KEY_METRIC: "0.89 Precision"
    }
  },
  {
    id: "proj_03",
    title: "Artificially Generated Images Binary Image Classifier",
    date: "July 2024 - November 2024",
    status: "MISSION_COMPLETE",
    details: "Developed real-time YOLOv11l Classification model to distinguish authentic from synthetic images. Improved generalization via targeted augmentation. Achieved unified 0.73 Precision, Recall, and Accuracy.",
    repoUrl: "",
    tags: ["YOLOv11l-cls", "Classification", "Deep Learning", "Image Processing"],
    tacticalData: {
      OBJECTIVE: "CLASSIFICATION",
      MODEL_USED: "YOLOv11l",
      DATASET_SIZE: "15,000",
      KEY_METRIC: "0.73 Accuracy"
    }
  },
  {
    id: "proj_04",
    title: "Anti-Social Driving Behaviour Detector",
    date: "February 2025 - June 2025",
    status: "MISSION_COMPLETE",
    details: "Developed a YOLOv12s deep learning system classifying illegal U-turns/swerving. Applied Gaussian/Savitzky-Golay filtering for noisy tracking data. Trained on 20,000 images. YOLOv12s achieved mAP50-95 of 0.893. Behavioural classifier achieved 0.86 precision.",
    repoUrl: "https://github.com/Raikiri001/Anti-social-driving-Behaviour-Detector",
    tags: ["YOLOv12s", "Computer Vision", "Object Tracking", "Object Detection", "Behaviour Classification"],
    tacticalData: {
      OBJECTIVE: "OBJECT_DETECTION, OBJECT_TRACKING, CLASSIFICATION",
      MODEL_USED: "YOLOv12s",
      DATASET_SIZE: "20,000",
      KEY_METRIC: "0.893 mAP50-95"
    }
  },
  {
    id: "proj_05",
    title: "Illegal Parking Detector",
    date: "February 2025 - June 2025",
    status: "MISSION_COMPLETE",
    details: "Two-stage CV system integrating road instance segmentation (YOLOv8l-seg) with vehicle detection (YOLOv11s). Analyzes spatial relationships for complex violations (double parking, kerb alignment). Applied convex hull post-processing to refine masks.",
    repoUrl: "https://github.com/Raikiri001/Illegal-Parking-Detector",
    tags: ["YOLOv8l-seg", "YOLOv11s", "Instance Segmentation", "Object Tracking", "Object Detection", "Behaviour Classification"],
    tacticalData: {
      OBJECTIVE: "OBJECT_DETECTION, OBJECT_TRACKING, INSTANCE_SEGMENTATION, CLASSIFICATION",
      MODEL_USED: "YOLOv8l-seg, YOLOv11s",
      DATASET_SIZE: "12,000",
      KEY_METRIC: "YOLOv8l-seg: 0.831 mAP50-95, YOLOv11s 0.893 mAP50"
    }
  },
  {
    id: "proj_06",
    title: "Image Mean Opinion Score Regressor",
    date: "July 2025 - October 2025",
    status: "MISSION_COMPLETE",
    details: "Developed EfficientNetB2 CNN for Image Quality Assessment (IQA). Custom regression head for MOS. Achieved PLCC of 0.83 and SROCC of 0.79. Designed and implemented a custom regression head optimized for this IQA task.",
    repoUrl: "https://github.com/Raikiri001/Image-Mean-Opinion-Score-Regressor",
    tags: ["EfficientNetB2", "Image Quality Assessment", "Regression"],
    tacticalData: {
      OBJECTIVE: "REGRESSION",
      MODEL_USED: "Custom EfficientNetB2",
      DATASET_SIZE: "11,000",
      KEY_METRIC: "0.83 PLCC, SROCC 0.79"
    }
  },
  {
    id: "proj_07",
    title: "Personal Portfolio Website v2.0",
    date: "March 2026 - Present",
    status: "MISSION_ONGOING",
    details: "Developed an interactive, high-performance portfolio website designed to mirror a mobile suit cockpit interface. This project bridges the gap between web development and the mechanical aesthetics of the Gundam SEED and Macross Frontier universes. Developed to display projects.",
    repoUrl: "https://github.com/Raikiri001/nero-portfolio",
    tags: ["Three.js", "JavaScript", "Website Development"],
    tacticalData: {
      OBJECTIVE: "WEB_DEV",
      FRAMEWORK: "REACT",
    }
  }
];

export const COMM_LINKS = {
  headers: {
    status: "ACTIVE_STATUS",
    type: "PROTOCOL"
  },
  nodes: [
    {
      id: 'github',
      label: 'GITHUB',
      type: 'REPOSITORY',
      value: 'Nero_G',
      url: 'https://github.com/Raikiri001',
      active: 'TRUE'
    },
    {
      id: 'linkedin',
      label: 'LINKEDIN',
      type: 'PROFESSIONAL_NET',
      value: 'Nero_G',
      url: 'https://www.linkedin.com/in/nero-garcia-935a8b283/',
      active: 'TRUE'
    },
    {
      id: 'email',
      label: 'EMAIL',
      type: 'DIRECT_COMM',
      value: 'nero@example.com',
      url: 'mailto:n_garcia_20a@outlook.com',
      active: 'TRUE'
    }
  ]
};

