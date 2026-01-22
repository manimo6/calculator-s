import React, { useState } from 'react';
import '../../styles/pages/admin.css'; // Ensure admin styles are loaded
import { auth } from '../../auth';

const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState<any>('');
    const [password, setPassword] = useState<any>('');
    const [error, setError] = useState<any>('');
    const [loading, setLoading] = useState<any>(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await auth.login(username, password);
            onLogin(user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div id="loginSection" className="login-wrapper" style={{ display: 'flex' }}> {/* Override display:none from CSS if present default */}
            <div className="login-card">
                <h2>관리자 로그인</h2>
                <p>관리자 계정으로 로그인해주세요.</p>
                <form id="loginForm" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="loginUsername">아이디</label>
                        <input
                            type="text"
                            id="loginUsername"
                            className="form-input"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="loginPassword">비밀번호</label>
                        <input
                            type="password"
                            id="loginPassword"
                            className="form-input"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <div id="loginError" className="login-error" style={{ display: 'block' }}>{error}</div>}
                    <button
                        type="submit"
                        className="action-btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
                        disabled={loading}
                    >
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                    <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#666', textAlign: 'center' }}>
                        (계정이 없다면 계정 관리자에게 문의하세요)
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
