import { useLanguage } from '../../../hooks/useLanguage';
import './PilotProfile.css';

export function PilotProfile() {
  const { t } = useLanguage();

  return (
    <div className="panel panel--left-slant pilot-profile">
      <div className="panel__header">{t('pilot_name')}_DOSSIER</div>

      <div className="pilot-profile__avatar">
        <div className="pilot-avatar-ring">
          <div className="pilot-avatar-ring__inner">
            <span className="pilot-avatar-initial">N</span>
          </div>
        </div>
      </div>

      <div className="pilot-profile__data">
        <div className="panel__data-row">
          <span className="label">{t('pilot_name')}</span>
          <span className="value">NERO_G</span>
        </div>
        <div className="panel__data-row">
          <span className="label">{t('pilot_blood')}</span>
          <span className="value">COORDINATOR</span>
        </div>
        <div className="panel__data-row">
          <span className="label">{t('pilot_affiliation')}</span>
          <span className="value">ZAFT / SMS</span>
        </div>
        <div className="panel__data-row">
          <span className="label">{t('pilot_status')}</span>
          <span className="value" style={{ color: '#00ff88' }}>ACTIVE</span>
        </div>
        <div className="panel__data-row">
          <span className="label">SPECIALIZATION</span>
          <span className="value">CV / DL</span>
        </div>
        <div className="panel__data-row">
          <span className="label">UNIT</span>
          <span className="value">STRIKE-MESSIAH</span>
        </div>
      </div>

      <div className="pilot-profile__clearance">
        <div className="clearance-bar">
          <div className="clearance-bar__fill" />
        </div>
        <span className="clearance-label">CLEARANCE_LVL: FREEDOM</span>
      </div>
    </div>
  );
}
