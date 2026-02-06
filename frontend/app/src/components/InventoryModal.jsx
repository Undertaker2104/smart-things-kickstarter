import { useState, useEffect } from 'react';
import './InventoryModal.css';

const InventoryModal = ({ open, onClose, inventory, onSave }) => {
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [errorIds, setErrorIds] = useState([]);
    const [wasOpen, setWasOpen] = useState(false);

    useEffect(() => {
        if (open && !wasOpen && inventory) {
            const initial = {};
            inventory.forEach(item => {
                initial[item.ball_type_id] = item.expected_count || 0;
            });
            setValues(initial);
            setErrorIds([]);
        }
        setWasOpen(open);
    }, [open, inventory, wasOpen]);

    useEffect(() => {
        if (open) {
            setErrorIds([]);
        }
    }, [open]);

    if (!open) return null;

    const handleChange = (ballTypeId, value) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            setValues(prev => ({ ...prev, [ballTypeId]: numValue }));
        } else if (value === '') {
            setValues(prev => ({ ...prev, [ballTypeId]: '' }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setErrorIds([]);
        try {
            await onSave(values);
            onClose();
        } catch (err) {
            if (err.failedIds) {
                setErrorIds(err.failedIds);
            } else {
                setErrorIds(Object.keys(values).map(id => parseInt(id, 10)));
            }
        } finally {
            setSaving(false);
        }
    };

    const ballTypes = [
        { id: 1, name: 'Basketballs', color: 'var(--basketball)' },
        { id: 2, name: 'Soccer Balls', color: 'var(--football)' },
        { id: 3, name: 'Volleyballs', color: 'var(--volleyball)' }
    ];

    return (
        <div className="inventory-modal-overlay" onClick={onClose}>
            <div className="inventory-modal-content" onClick={e => e.stopPropagation()}>
                <h2>Edit Inventory</h2>
                <p className="inventory-modal-subtitle">Set expected counts for each ball type</p>

                <div className="inventory-modal-items">
                    {ballTypes.map(type => (
                        <div key={type.id} className="inventory-modal-item">
                            <div className="inventory-modal-item-label">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={type.color}>
                                    {type.id === 1 && <path d="M148-513.33h129.33q-6.66-44.67-26.33-84-19.67-39.34-49-68.67-21.33 33-36.17 71.17Q151-556.67 148-513.33Zm534.67 0H812q-3-43.34-17.83-81.5Q779.33-633 758-666q-31.33 31.33-50 69.67-18.67 38.33-25.33 83ZM202-294.67Q233.33-326 252-364t25.33-82.67H148q3 43.34 17.83 81.17 14.84 37.83 36.17 70.83Zm556 0q21.33-33 36.17-70.83Q809-403.33 812-446.67H682.67Q689.33-402 708-364q18.67 38 50 69.33ZM345.33-513.33h101.34V-812q-59 7.33-109.84 31.17-50.83 23.83-91.5 63.5 40.34 40 66.17 92.16 25.83 52.17 33.83 111.84Zm168 0h101.34q8-59.67 34.16-111.84 26.17-52.16 66.5-92.16-40.66-39.67-91.83-63.5-51.17-23.84-110.17-31.17v298.67ZM446.67-148v-298.67H345.33q-8 59.67-33.83 111.5-25.83 51.84-66.17 91.84 40.67 39.66 89.84 63.83 49.16 24.17 111.5 31.5Zm66.66 0q62.34-7.33 111.84-31.5t90.16-63.83q-40.33-40-66.5-91.84-26.16-51.83-34.16-111.5H513.33V-148ZM480-476.67ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />}
                                    {type.id === 2 && <path d="M480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-155.67 31.5-72.66 85.83-127Q251.67-817 324.67-848.5T480-880q83 0 155.67 31.5 72.66 31.5 127 85.83 54.33 54.34 85.83 127Q880-563 880-480q0 82.33-31.5 155.33-31.5 73-85.83 127.34-54.34 54.33-127 85.83Q563-80 480-80Zm203.33-495.33 64-22L764.67-658q-33.34-51.33-81.67-87.83t-108.33-55.5L513.33-760v65.33l170 119.34Zm-406 0 169.34-119.34V-760L386-801.33q-60 19-108.33 55.5Q229.33-709.33 196-658l20 60.67 61.33 22Zm-50 316 55.34-6 36-61.34L258-512l-66-22.67-45.33 36q0 69.67 16.66 127.17 16.67 57.5 64 112.17ZM480-146.67q26.67 0 53.33-4.66Q560-156 588-164l31.33-68-30-51.33h-218l-30 51.33 31.34 68q25.33 8 53 12.67 27.66 4.66 54.33 4.66ZM379.33-350H578l59.33-175.33-157.33-112-158.67 112 58 175.33Zm354 90.67Q780-314 796.67-371.5q16.66-57.5 16.66-127.17L768-530l-65.33 18L642-326.67l35.33 61.34 56 6Z" />}
                                    {type.id === 3 && <path d="M798-580q-29.67-93.67-106-157.5T513.33-812v67.33L798-580ZM304.67-419.33l142-83.34V-812q-38 4.33-73.67 16.17-35.67 11.83-68.33 32.5v344Zm-128.67 76L238-380v-329.33Q193.67-662.67 170.17-603t-23.5 123q0 36.67 7.5 70.17t21.83 66.5ZM322.67-186l302-174L480-444.67 208.67-285.33Q231.33-255 260-229q28.67 26 62.67 43ZM480-146.67q82.33 0 153.33-37 71-37 118-102.33L690-321.33l-286 166q18.67 4.33 38 6.5 19.33 2.16 38 2.16ZM784-344q16.33-35 23.17-71.5Q814-452 813.33-492l-300-174.67v164L784-344ZM480-480Zm0 400q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />}
                                </svg>
                                <span>{type.name}</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={values[type.id] ?? ''}
                                onChange={e => handleChange(type.id, e.target.value)}
                                className={`inventory-modal-input${errorIds.includes(type.id) ? ' inventory-modal-input-error' : ''}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="inventory-modal-actions">
                    <button
                        className="inventory-modal-button inventory-modal-cancel"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className="inventory-modal-button inventory-modal-save"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventoryModal;
