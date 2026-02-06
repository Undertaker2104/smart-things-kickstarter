import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomBar.css';
import '../theme/colors.css';
import StatusIcon from "../assets/icons/status.svg";
import ChartIcon from "../assets/icons/chart.svg";
import InventoryIcon from "../assets/icons/inventory.svg";
import { sessionAPI, commandAPI } from '../services/api';
import { API_BASE_URL } from '../services/api';
import { DateTime } from 'luxon';
import SessionControls from './SessionControls';
import FinishedModal, { ErrorModal } from './FinishedModal';

const BottomBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sessionStatus, setSessionStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [commandIds, setCommandIds] = useState([]);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessions = await sessionAPI.getSessions();
                if (Array.isArray(sessions) && sessions.length > 0) {
                    const latest = sessions[0];
                    if (latest.status === 'RUNNING' || latest.status === 'PAUSED') {
                        setSessionStatus(latest.status);
                    } else {
                        setSessionStatus(null);
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

    useEffect(() => {
        if (commandIds.length === 0) return;

        const pollCommandStatuses = async () => {
            try {
                for (const commandId of commandIds) {
                    const command = await commandAPI.getCommandStatus(commandId);
                    if (command.command_status === 'FAILED') {
                        setErrorMessage(command.error_message || 'Command execution failed');
                        setShowErrorModal(true);

                        (async () => {
                            try {
                                const sessions = await sessionAPI.getSessions();
                                const matching = Array.isArray(sessions) && sessions.find(s => s.id === command.session_id);
                                if (matching) {
                                    setSessionStatus(matching.status);
                                }
                            } catch (e) {
                                console.warn('failed to refresh sessions after command failed', e);
                            }
                        })();

                        setCommandIds(prev => prev.filter(id => id !== commandId));
                    }
                }
            } catch (err) {
                console.error('Failed to poll command status:', err);
            }
        };

        const interval = setInterval(pollCommandStatuses, 2000);
        return () => clearInterval(interval);
    }, [commandIds]);

    const handleStartSession = async () => {
        setLoading(true);
        try {
            const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const sessionData = await sessionResponse.json();
            const sessionId = sessionData.sessionId;

            commandAPI.createCommand('START_CLEANING', sessionId).then(command => {
                setCommandIds(prev => [...prev, command.id]);
            }).catch(err => {
                console.error('Failed to create start command:', err);
            });

            setSessionStatus('RUNNING');
            window.dispatchEvent(new CustomEvent('sessionStatusChanged', { detail: { status: 'RUNNING', sessionId } }));
        } catch (err) {
            console.error('Failed to start session:', err);
            setErrorMessage('Failed to start session');
            setShowErrorModal(true);
        }
        setLoading(false);
    };

    const handlePauseSession = async () => {
        const prev = sessionStatus;
        if (sessionStatus === 'RUNNING') setSessionStatus('PAUSED');
        setLoading(true);

        try {
            const sessions = await sessionAPI.getSessions();
            const active = Array.isArray(sessions) && sessions.find(s => s.status === 'RUNNING');
            if (active) {
                commandAPI.createCommand('STOP_CLEANING', active.id).then(command => {
                    setCommandIds(prevIds => [...prevIds, command.id]);
                }).catch(err => {
                    console.error('Failed to create pause command:', err);
                });

                const endedAt = DateTime.now().setZone('Europe/Amsterdam').toISO();
                await fetch(`${API_BASE_URL}/api/sessions/${active.id}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'PAUSED', endedAt })
                });

                window.dispatchEvent(new CustomEvent('sessionStatusChanged', { detail: { status: 'PAUSED', sessionId: active.id } }));
            } else {
                setSessionStatus(prev);
            }
        } catch (err) {
            console.error('Failed to pause session:', err);
            setSessionStatus(prev);
            setErrorMessage('Failed to pause session');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResumeSession = async () => {
        const prev = sessionStatus;
        if (sessionStatus === 'PAUSED') setSessionStatus('RUNNING');
        setLoading(true);

        try {
            const sessions = await sessionAPI.getSessions();
            const paused = Array.isArray(sessions) && sessions.find(s => s.status === 'PAUSED');
            if (paused) {
                commandAPI.createCommand('START_CLEANING', paused.id).then(command => {
                    setCommandIds(prevIds => [...prevIds, command.id]);
                }).catch(err => {
                    console.error('Failed to create resume command:', err);
                });

                await fetch(`${API_BASE_URL}/api/sessions/resume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                window.dispatchEvent(new CustomEvent('sessionStatusChanged', { detail: { status: 'RUNNING', sessionId: paused.id } }));
            } else {
                setSessionStatus(prev);
            }
        } catch (err) {
            console.error('Failed to resume session:', err);
            setSessionStatus(prev);
            setErrorMessage('Failed to resume session');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    const handleStopSession = async () => {
        const prev = sessionStatus;
        if (sessionStatus === 'RUNNING' || sessionStatus === 'PAUSED') {
            setSessionStatus(null);
        }
        setLoading(true);

        try {
            const sessions = await sessionAPI.getSessions();
            const active = Array.isArray(sessions) && sessions.find(s => s.status === 'RUNNING' || s.status === 'PAUSED');
            if (active) {
                commandAPI.createCommand('STOP_CLEANING', active.id).then(command => {
                    setCommandIds(prevIds => [...prevIds, command.id]);
                }).catch(err => {
                    console.error('Failed to create stop command:', err);
                });

                const endedAt = DateTime.now().setZone('Europe/Amsterdam').toISO();
                await fetch(`${API_BASE_URL}/api/sessions/${active.id}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'FINISHED', endedAt })
                });

                setShowFinishedModal(true);

                window.dispatchEvent(new CustomEvent('sessionStatusChanged', { detail: { status: null, sessionId: active.id } }));
            } else {
                setSessionStatus(prev);
            }
        } catch (err) {
            console.error('Failed to stop session:', err);
            setSessionStatus(prev);
            setErrorMessage('Failed to stop session');
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FinishedModal open={showFinishedModal} onClose={() => setShowFinishedModal(false)} />
            <ErrorModal
                open={showErrorModal}
                onClose={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                }}
                errorMessage={errorMessage}
            />
            <div className="bottom-bar">
                <div className="botTop">
                    <SessionControls
                        sessionStatus={sessionStatus}
                        loading={loading}
                        onStart={handleStartSession}
                        onPause={handlePauseSession}
                        onResume={handleResumeSession}
                        onStop={handleStopSession}
                        disabled={showFinishedModal || showErrorModal}
                    />
                </div>
                <div className="botBot">
                    <div className="btm-buttons-container">
                        <button
                            className={`btmBut ${location.pathname === '/inventory' ? 'active' : ''}`}
                            onClick={() => navigate('/inventory')}
                            disabled={showFinishedModal || showErrorModal}>
                            <img src={InventoryIcon} alt="Inventory" className="icon" />
                            <span className="label">Inventory</span>
                        </button>
                        <button
                            className={`btmBut ${location.pathname === '/status' ? 'active' : ''}`}
                            onClick={() => navigate('/status')}
                            disabled={showFinishedModal || showErrorModal}>
                            <img src={StatusIcon} alt="Status" className="icon" />
                            <span className="label">Status</span>
                        </button>
                        <button
                            className={`btmBut ${location.pathname === '/data' ? 'active' : ''}`}
                            onClick={() => navigate('/data')}
                            disabled={showFinishedModal || showErrorModal}>
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
