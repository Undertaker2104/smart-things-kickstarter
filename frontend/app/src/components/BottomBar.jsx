import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomBar.css';
import '../theme/colors.css';
import StatusIcon from "../assets/icons/status.svg";
import ChartIcon from "../assets/icons/chart.svg";
import InventoryIcon from "../assets/icons/inventory.svg";
import { sessionAPI } from '../services/api';
import { API_BASE_URL } from '../services/api';
import { DateTime } from 'luxon';
import SessionControls from './SessionControls';
import FinishedModal from './FinishedModal';

const BottomBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sessionStatus, setSessionStatus] = useState(null); // 'RUNNING', 'PAUSED', null
    const [loading, setLoading] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);

    // Fetch session status
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessions = await sessionAPI.getSessions();
                if (Array.isArray(sessions) && sessions.length > 0) {
                    // Get the latest session (assuming sorted by id DESC)
                    const latest = sessions[0];
                    if (latest.status === 'RUNNING' || latest.status === 'PAUSED') {
                        setSessionStatus(latest.status);
                    } else {
                        setSessionStatus(null); // Always show Start Session if not running/paused
                    }
                } else {
                    setSessionStatus(null);
                }
            } catch (err) {
                setSessionStatus(null);
            }
        };
        fetchSessions();
    }, []);

    // Start session handler
    const handleStartSession = async () => {
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            setSessionStatus('RUNNING');
        } catch (err) {
            // handle error
        }
        setLoading(false);
    };

    // Pause session handler
    const handlePauseSession = async () => {
        setLoading(true);
        try {
            const sessions = await sessionAPI.getSessions();
            const active = Array.isArray(sessions) && sessions.find(s => s.status === 'RUNNING');
            if (active) {
                const endedAt = DateTime.now().setZone('Europe/Amsterdam').toISO();
                await fetch(`${API_BASE_URL}/api/sessions/${active.id}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'PAUSED', endedAt })
                });
                setSessionStatus('PAUSED');
            }
        } catch (err) {
            // handle error
        }
        setLoading(false);
    };

    // Resume session handler
    const handleResumeSession = async () => {
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/api/sessions/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            setSessionStatus('RUNNING');
        } catch (err) {
            // handle error
        }
        setLoading(false);
    };

    // Stop session handler
    const handleStopSession = async () => {
        setLoading(true);
        try {
            const sessions = await sessionAPI.getSessions();
            const active = Array.isArray(sessions) && sessions.find(s => s.status === 'RUNNING' || s.status === 'PAUSED');
            if (active) {
                const endedAt = DateTime.now().setZone('Europe/Amsterdam').toISO();
                await fetch(`${API_BASE_URL}/api/sessions/${active.id}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'FINISHED', endedAt })
                });
                setSessionStatus(null);
                setShowFinishedModal(true);
            }
        } catch (err) {
            // handle error
        }
        setLoading(false);
    };

    return (
        <>
            <FinishedModal open={showFinishedModal} onClose={() => setShowFinishedModal(false)} />
            <div className="bottom-bar">
                <div className="botTop">
                    <SessionControls
                        sessionStatus={sessionStatus}
                        loading={loading}
                        onStart={handleStartSession}
                        onPause={handlePauseSession}
                        onResume={handleResumeSession}
                        onStop={handleStopSession}
                        disabled={showFinishedModal}
                    />
                </div>
                <div className="botBot">
                    <div className="btm-buttons-container">
                        <button
                            className={`btmBut ${location.pathname === '/inventory' ? 'active' : ''}`}
                            onClick={() => navigate('/inventory')}
                            disabled={showFinishedModal}>
                            <img src={InventoryIcon} alt="Inventory" className="icon" />
                            <span className="label">Inventory</span>
                        </button>
                        <button
                            className={`btmBut ${location.pathname === '/status' ? 'active' : ''}`}
                            onClick={() => navigate('/status')}
                            disabled={showFinishedModal}>
                            <img src={StatusIcon} alt="Status" className="icon" />
                            <span className="label">Status</span>
                        </button>
                        <button
                            className={`btmBut ${location.pathname === '/data' ? 'active' : ''}`}
                            onClick={() => navigate('/data')}
                            disabled={showFinishedModal}>
                            <img src={ChartIcon} alt="Chart" className="icon" />
                            <span className="label">Data</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BottomBar;
