// ============================================================
// Project / Mission Data
// ============================================================

export const projects = [
  {
    id: 'mission-01',
    codename: 'OPERATION EMPATH',
    title: 'Emotion Detection System',
    classification: 'ALPHA',
    status: 'COMPLETE',
    description: [
      'Deep learning-based facial emotion recognition system utilizing',
      'Convolutional Neural Networks for real-time affect analysis.',
      'The model processes live video input to classify seven distinct',
      'emotional states with 94.2% validation accuracy.',
      '',
      'Deployed pipeline features preprocessing augmentation,',
      'transfer learning from VGG-16, and optimized inference',
      'for edge deployment scenarios.',
    ],
    armament: ['Python', 'PyTorch', 'CNN', 'OpenCV', 'NumPy'],
    visualType: 'neural-face',
    threat_level: 'HIGH',
    sortie_date: '2024.08.15',
  },
  {
    id: 'mission-02',
    codename: 'OPERATION GUARDIAN',
    title: 'Anti-Social Driving Detection',
    classification: 'BRAVO',
    status: 'COMPLETE',
    description: [
      'Computer vision system for detecting aggressive and anti-social',
      'driving behaviors from traffic surveillance footage.',
      'Employs YOLO-based object detection with custom-trained models',
      'for vehicle tracking and behavioral pattern analysis.',
      '',
      'Features bird\'s-eye-view trajectory mapping, threat',
      'classification scoring, and real-time alert generation',
      'for traffic management systems.',
    ],
    armament: ['Python', 'YOLOv8', 'OpenCV', 'TensorFlow', 'Scikit-learn'],
    visualType: 'tactical-map',
    threat_level: 'CRITICAL',
    sortie_date: '2024.11.22',
  },
];

export const skills = {
  mainArmament: [
    { name: 'Python', type: 'High-Energy Beam Rifle', power: 95, stability: 90 },
    { name: 'C++', type: 'Heavy Railgun', power: 80, stability: 75 },
    { name: 'JavaScript', type: 'Rapid Beam Vulcan', power: 85, stability: 88 },
  ],
  avionics: [
    { name: 'Git', type: 'Navigation ECM', status: 'ACTIVE' },
    { name: 'Docker', type: 'Containment System', status: 'ACTIVE' },
    { name: 'Linux', type: 'Core OS Module', status: 'ACTIVE' },
  ],
  supportUnits: [
    { name: 'React', type: 'Archangel-class', role: 'Frontend Carrier' },
    { name: 'Vite', type: 'Eternal-class', role: 'Build Accelerator' },
    { name: 'OpenCV', type: 'Macross Quarter', role: 'Vision Processor' },
  ],
  nihongo: {
    syncRate: 45,
    unit: 'GENKI_UNIT_L11',
    status: 'STABLE',
    kanji: [
      { char: '人工', meaning: 'Artificial', reading: 'じんこう' },
      { char: '知能', meaning: 'Intelligence', reading: 'ちのう' },
      { char: '学習', meaning: 'Learning', reading: 'がくしゅう' },
      { char: '認識', meaning: 'Recognition', reading: 'にんしき' },
      { char: '検出', meaning: 'Detection', reading: 'けんしゅつ' },
      { char: '解析', meaning: 'Analysis', reading: 'かいせき' },
      { char: '研究', meaning: 'Research', reading: 'けんきゅう' },
      { char: '開発', meaning: 'Development', reading: 'かいはつ' },
      { char: '処理', meaning: 'Processing', reading: 'しょり' },
      { char: '画像', meaning: 'Image', reading: 'がぞう' },
      { char: '深層', meaning: 'Deep (layer)', reading: 'しんそう' },
      { char: '神経', meaning: 'Neural', reading: 'しんけい' },
    ],
  },
};

export const commLinks = [
  {
    id: 'email',
    label: 'ENCRYPTED_FREQ',
    type: 'Email',
    value: 'your.email@example.com',
    icon: '📡',
    frequency: 'FREQ_001',
  },
  {
    id: 'linkedin',
    label: 'TACTICAL_NET',
    type: 'LinkedIn',
    value: 'linkedin.com/in/your-profile',
    url: 'https://linkedin.com/in/your-profile',
    icon: '🔗',
    frequency: 'FREQ_002',
  },
  {
    id: 'github',
    label: 'CODE_REPOSITORY',
    type: 'GitHub',
    value: 'github.com/your-username',
    url: 'https://github.com/your-username',
    icon: '⚙',
    frequency: 'FREQ_003',
  },
];
