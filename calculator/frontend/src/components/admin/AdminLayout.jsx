import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/pages/admin.css';

const AdminLayout = ({ children, user, activeTab, onTabChange, onLogout }) => {
    const tabs = [
        { id: 'notices', label: '공지사항', icon: 'fas fa-bullhorn' },
        { id: 'courses', label: '수업목록', icon: 'fas fa-book' },
        { id: 'registrations', label: '등록현황', icon: 'fas fa-calendar-check' },
        { id: 'notes', label: '과목별 메모', icon: 'fas fa-sticky-note' },
        { id: 'accounts', label: '계정 관리', icon: 'fas fa-user-shield' },
        { id: 'settings', label: '설정', icon: 'fas fa-gear' }
    ];

    const visibleTabs = user?.role === 'master'
        ? tabs
        : tabs.filter((t) => t.id !== 'accounts');

    return (
        <div id="adminApp" className="admin-app" style={{ display: 'flex' }}>
            {/* Sidebar */}
            <div className="sidebar">
                <h2><i className="fas fa-calculator"></i> 관리자 모드</h2>
                {visibleTabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`menu-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <i className={tab.icon}></i> {tab.label}
                    </div>
                ))}

                <button
                    id="logoutBtn"
                    type="button"
                    className="back-btn"
                    style={{ marginTop: 'auto', marginBottom: '8px' }}
                    onClick={onLogout}
                >
                    <i className="fas fa-sign-out-alt"></i> 로그아웃
                </button>
                <Link to="/" className="back-btn">
                    <i className="fas fa-arrow-left"></i> 계산기로 돌아가기
                </Link>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {children}
            </div>
        </div>
    );
};

export default AdminLayout;
