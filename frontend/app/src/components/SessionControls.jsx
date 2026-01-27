import React from 'react';

const SessionControls = ({
    sessionStatus,
    loading,
    onStart,
    onPause,
    onResume,
    onStop,
    disabled = false
}) => {
    const isDisabled = loading || disabled;
    return (
        <div className="ctrl-buttons-container">
            {sessionStatus === 'RUNNING' && (
                <>
                    <button className='pauseBut' onClick={onPause} disabled={isDisabled}>
                        <span className="butText">Pause Session</span>
                    </button>
                    <button className='stopBut' onClick={onStop} disabled={isDisabled}>
                        <span className="butText">Stop Session</span>
                    </button>
                </>
            )}
            {sessionStatus === 'PAUSED' && (
                <>
                    <button className='startBut' onClick={onResume} disabled={isDisabled}>
                        <span className="butText">Resume Session</span>
                    </button>
                    <button className='stopBut' onClick={onStop} disabled={isDisabled}>
                        <span className="butText">Stop Session</span>
                    </button>
                </>
            )}
            {!sessionStatus && (
                <>
                    <button className='startBut' onClick={onStart} disabled={isDisabled}>
                        <span className="butText">Start Session</span>
                    </button>
                    <button className='stopBut' disabled>
                        <span className="butText">Stop Session</span>
                    </button>
                </>
            )}
        </div>
    );
};

export default SessionControls;
