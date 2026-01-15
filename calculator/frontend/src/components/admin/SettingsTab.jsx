import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api-client.js';

const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [settings, setSettings] = useState({});
  const [minMonth, setMinMonth] = useState('');
  const [maxMonth, setMaxMonth] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiClient.getSettings();
      const nextSettings = res?.settings || {};
      const calendarRange = nextSettings?.calendarRange || {};
      setSettings(nextSettings);
      setMinMonth(calendarRange.minMonth || '');
      setMaxMonth(calendarRange.maxMonth || '');
    } catch (e) {
      setError(e?.message || '설정을 불러오지 못했습니다.');
      setSettings({});
      setMinMonth('');
      setMaxMonth('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const nextSettings = {
        ...(settings || {}),
        calendarRange: {
          minMonth: (minMonth || '').trim(),
          maxMonth: (maxMonth || '').trim(),
        },
      };
      const res = await apiClient.saveSettings(nextSettings);
      const saved = res?.settings || nextSettings;
      const calendarRange = saved?.calendarRange || nextSettings.calendarRange;
      setSettings(saved);
      setMinMonth(calendarRange.minMonth || '');
      setMaxMonth(calendarRange.maxMonth || '');
      setMessage('설정이 저장되었습니다.');
    } catch (e) {
      setError(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>설정</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>개인 설정입니다.</p>
        </div>
        <button type="button" className="action-btn btn-outline" onClick={load} disabled={loading || saving}>
          새로고침
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 10, color: '#e74c3c', fontWeight: 600 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ marginBottom: 10, color: '#2ecc71', fontWeight: 700 }}>
          {message}
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fafafa' }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>달력 범위 설정(개인 설정)</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            시작 월{' '}
            <input type="month" value={minMonth} onChange={(e) => setMinMonth(e.target.value)} disabled={loading || saving} />
          </label>
          <label>
            종료 월{' '}
            <input type="month" value={maxMonth} onChange={(e) => setMaxMonth(e.target.value)} disabled={loading || saving} />
          </label>
          <button type="button" className="action-btn btn-primary" onClick={save} disabled={loading || saving}>
            저장
          </button>
        </div>
        <div style={{ marginTop: 6, color: '#666', fontSize: '0.9em' }}>* 비우면 전체 표시</div>
      </div>
    </div>
  );
};

export default SettingsTab;
