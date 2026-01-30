import React, { useEffect, useState } from 'react';
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
    const [sessionStatus, setSessionStatus] = useState(null); // 'RUNNING', 'PAUSED', null
    const [loading, setLoading] = useState(false);
    const [showFinishedModal, setShowFinishedModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [commandIds, setCommandIds] = useState([]); // Track command IDs for polling

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

    // Poll command status for failures
    useEffect(() => {
        if (commandIds.length === 0) return;

        const pollCommandStatuses = async () => {
            try {
                for (const commandId of commandIds) {
                    const command = await commandAPI.getCommandStatus(commandId);
                    if (command.command_status === 'FAILED') {
                        setErrorMessage(command.error_message || 'Command execution failed');
                        setShowErrorModal(true);

                        // If the failed command references the session, refresh server state and reflect it in the UI.
                        (async () => {
                            try {
                                const sessions = await sessionAPI.getSessions();
                                const matching = Array.isArray(sessions) && sessions.find(s => s.id === command.session_id);
                                if (matching) {
                                    // Use authoritative server status (could already be ERROR, PAUSED, etc.)
                                    setSessionStatus(matching.status);
                                }
                            } catch (e) {
                                console.warn('failed to refresh sessions after command failed', e);
                            }
                        })();

                        // Remove this command from tracking
                        setCommandIds(prev => prev.filter(id => id !== commandId));
                    }
                }
            } catch (err) {
                console.error('Failed to poll command status:', err);
            }
        };

        // Poll every 2 seconds
        const interval = setInterval(pollCommandStatuses, 2000);
        return () => clearInterval(interval);
    }, [commandIds]);

    // Start session handler
    const handleStartSession = async () => {
        setLoading(true);
        try {
            // Start the session first
            const sessionResponse = await fetch(`${API_BASE_URL}/api/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const sessionData = await sessionResponse.json();
            const sessionId = sessionData.sessionId;

            // Create START_CLEANING command for the microcontroller (don't wait)
            commandAPI.createCommand('START_CLEANING', sessionId).then(command => {
                setCommandIds(prev => [...prev, command.id]);
            }).catch(err => {
                console.error('Failed to create start command:', err);
            });

            // Immediately update UI
            setSessionStatus('RUNNING');
        } catch (err) {
            console.error('Failed to start session:', err);
            setErrorMessage('Failed to start session');
            setShowErrorModal(true);
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
                // Create STOP_CLEANING command for the microcontroller (don't wait)
                commandAPI.createCommand('STOP_CLEANING', active.id).then(command => {
                    setCommandIds(prev => [...prev, command.id]);
                }).catch(err => {
                    console.error('Failed to create pause command:', err);
                });

                // Immediately update UI
                const endedAt = DateTime.now().setZone('Europe/Amsterdam').toISO();
                await fetch(`${API_BASE_URL}/api/sessions/${active.id}/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'PAUSED', endedAt })
                });
                setSessionStatus('PAUSED');
            }
        } catch (err) {
            console.error('Failed to pause session:', err);
            setErrorMessage('Failed to pause session');
            setShowErrorModal(true);
        }
        setLoading(false);
    };

    // Resume session handler
    const handleResumeSession = async () => {
        setLoading(true);
        try {
            const sessions = await sessionAPI.getSessions();
            const paused = Array.isArray(sessions) && sessions.find(s => s.status === 'PAUSED');
            if (paused) {
                // Create START_CLEANING command for the microcontroller (don't wait)
                commandAPI.createCommand('START_CLEANING', paused.id).then(command => {
                    setCommandIds(prev => [...prev, command.id]);
                }).catch(err => {
                    console.error('Failed to create resume command:', err);
                });

                // Immediately update UI
                await fetch(`${API_BASE_URL}/api/sessions/resume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                setSessionStatus('RUNNING');
            }
        } catch (err) {
            console.error('Failed to resume session:', err);
            setErrorMessage('Failed to resume session');
            setShowErrorModal(true);
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
                // Create STOP_CLEANING command for the microcontroller (don't wait)
                commandAPI.createCommand('STOP_CLEANING', active.id).then(command => {
                    setCommandIds(prev => [...prev, command.id]);
                }).catch(err => {
                    console.error('Failed to create stop command:', err);
                });

                // Immediately update UI
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
            console.error('Failed to stop session:', err);
            setErrorMessage('Failed to stop session');
            setShowErrorModal(true);
        }
        setLoading(false);
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
