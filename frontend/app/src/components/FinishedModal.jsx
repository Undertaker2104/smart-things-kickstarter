import React from 'react';
import './FinishedModal.css';

const FinishedModal = ({ open, onClose }) => {
    if (!open) return null;
    return (
        <div className="finished-modal-overlay">
            <div className="finished-modal-content">
                <h2>Session Finished!</h2>
                <p>Your session has been successfully completed.</p>
                <button className="finished-modal-button" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default FinishedModal;
