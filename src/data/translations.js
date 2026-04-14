// ============================================================
// Translation Map — EN/JA Dual-OS Synchronization
// ============================================================

export const translations = {
  // Navigation
  nav_home: { en: 'HOME', ja: 'ホーム' },
  nav_sorties: { en: 'SORTIES', ja: '出撃' },
  nav_about: { en: 'ABOUT', ja: 'データ' },
  nav_comms: { en: 'COMMS', ja: '通信' },

  // Section Headers
  section_command: { en: 'STRATEGIC COMMAND CENTER', ja: '戦略指揮センター' },
  section_sortie: { en: 'TACTICAL SORTIE & COMBAT LOGS', ja: '戦術出撃 & 戦闘記録' },
  section_hangar: { en: 'SYSTEMS, ARMAMENT & LINGUISTICS', ja: 'システム・武装・言語学' },
  section_contact: { en: 'QUANTUM FOLD TRANSMISSION', ja: '量子フォールド通信' },

  // Boot Sequence
  boot_neural: { en: 'CONNECTING TO NEURAL LINK...', ja: 'ニューラルリンク接続中...' },
  boot_ok: { en: '[OK]', ja: '[完了]' },
  boot_init: { en: 'INITIALIZING P.I.L.O.T. SYSTEM', ja: 'P.I.L.O.T.システム起動中' },
  boot_complete: { en: 'ALL SYSTEMS NOMINAL', ja: '全システム正常' },
  boot_click: { en: 'CLICK TO INITIALIZE NEURAL LINK', ja: 'クリックしてニューラルリンク起動' },

  // Pilot Profile
  pilot_name: { en: 'PILOT', ja: 'パイロット' },
  pilot_blood: { en: 'BLOOD_TYPE', ja: '血液型' },
  pilot_affiliation: { en: 'AFFILIATION', ja: '所属' },
  pilot_status: { en: 'STATUS', ja: 'ステータス' },
  pilot_reactor: { en: 'REACTOR_OUTPUT', ja: 'リアクター出力' },

  // Portfolio
  mission_briefing: { en: 'MISSION_DEBRIEFING', ja: 'ミッション報告' },
  armament_loadout: { en: 'ARMAMENT_LOADOUT', ja: '武装装備' },
  target_locked: { en: 'TARGET_LOCKED', ja: 'ターゲットロック' },

  // Hangar
  main_armament: { en: 'MAIN ARMAMENT', ja: '主武装' },
  avionics: { en: 'AVIONICS / ECM', ja: 'アビオニクス / ECM' },
  support_units: { en: 'SUPPORT UNITS', ja: '支援機' },
  nihongo_sync: { en: 'NIHONGO NEURAL-LINK SYNC', ja: '日本語ニューラルリンク同期' },
  sync_rate: { en: 'SYNC_RATE', ja: '同期率' },

  // Contact
  comm_channels: { en: 'COMMUNICATION CHANNELS', ja: '通信チャンネル' },
  signal_folded: { en: 'SIGNAL FOLDED. CHANNELS OPEN.', ja: 'シグナルフォールド。チャンネル開放。' },
  commander_id: { en: 'COMMANDER_ID', ja: '指揮官ID' },
  encrypted_freq: { en: 'ENCRYPTED_FREQ', ja: '暗号周波数' },

  // Language Toggle
  lang_sync: { en: 'LANG_SYNC', ja: '言語同期' },
  seed_mode: { en: 'SEED MODE ACTIVATED', ja: 'SEEDモード発動' },

  // Data Stream
  data_node: { en: 'DATA_NODE', ja: 'データノード' },
  target_confirmed: { en: 'TARGET_CONFIRMED', ja: 'ターゲット確認' },
};

export const getTranslation = (key, language) => {
  const t = translations[key];
  if (!t) return key;
  return t[language] || t.en;
};
