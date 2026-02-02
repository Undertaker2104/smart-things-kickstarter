import './InventoryPage.css'
import '../theme/colors.css'

const status = "Cleaning";
const basketballColor = "var(--basketball)";
const footballColor = "var(--football)";
const volleyballColor = "var(--volleyball)";
const errorColor = "var(--error)";
const editColor = "var(--text)";

import { useEffect, useState } from 'react'
import { sessionAPI, inventoryAPI } from '../services/api'
import InventoryModal from '../components/InventoryModal'

const InventoryPage = () => {
    const [session, setSession] = useState(null) // last completed/active session metadata
    const [sessionItems, setSessionItems] = useState([])
    const [inventory, setInventory] = useState([])
    const [modalOpen, setModalOpen] = useState(false)

    const handleSaveInventory = async (values) => {
        // Update all changed inventory values, track failures
        const results = await Promise.allSettled(
            Object.entries(values).map(async ([ballTypeId, expectedCount]) => {
                await inventoryAPI.updateInventory(parseInt(ballTypeId, 10), expectedCount)
                return parseInt(ballTypeId, 10)
            })
        )

        const failedIds = results
            .map((result, index) => result.status === 'rejected' ? parseInt(Object.keys(values)[index], 10) : null)
            .filter(id => id !== null)

        if (failedIds.length > 0) {
            throw { failedIds }
        }

        // Refresh inventory after save
        const invResp = await inventoryAPI.getInventory()
        setInventory(Array.isArray(invResp) ? invResp : [])
    }

    useEffect(() => {
        let mounted = true
        const load = async () => {
            try {
                const sessions = await sessionAPI.getSessions()

                // Prefer the most-recent FINISHED session ("previous completed session").
                // Fallback to RUNNING / PAUSED / ERROR (to mirror other pages).
                let active = null
                if (Array.isArray(sessions) && sessions.length > 0) {
                    active = sessions.find(s => s.status === 'FINISHED') ||
                        sessions.find(s => s.status === 'RUNNING') ||
                        sessions.find(s => ['PAUSED', 'ERROR'].includes(s.status)) ||
                        null
                }

                const [detailResp, invResp] = await Promise.all([
                    active ? sessionAPI.getSessionDetail(active.id) : Promise.resolve(null),
                    inventoryAPI.getInventory()
                ])

                if (!mounted) return

                if (detailResp && detailResp.session) {
                    setSession(detailResp.session)
                    setSessionItems(detailResp.items || [])
                } else {
                    setSession(null)
                    setSessionItems([])
                }

                setInventory(Array.isArray(invResp) ? invResp : [])
            } catch (err) {
                console.error('Failed to load inventory page data', err)
            }
        }

        load()
        const interval = setInterval(load, 3000)
        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [])

    const itemsByType = Object.fromEntries((sessionItems || []).map(i => [i.ball_type_id, i]))
    const invByType = Object.fromEntries((inventory || []).map(i => [i.ball_type_id, i]))

    const types = [
        { id: 1, name: 'Basketballs', color: basketballColor },
        { id: 2, name: 'Soccer Balls', color: footballColor },
        { id: 3, name: 'Volleyballs', color: volleyballColor }
    ]

    const totalSession = types.reduce((s, t) => s + ((itemsByType[t.id] || {}).count || 0), 0)
    const totalExpected = types.reduce((s, t) => s + ((invByType[t.id] || {}).expected_count || 0), 0)

    const renderWarning = (sessionCount, expectedCount) => {
        if (sessionCount !== expectedCount) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="20px" fill={errorColor} title="Inventory mismatch: last session vs expected">
                    <path d="M479.99-280q15.01 0 25.18-10.15 10.16-10.16 10.16-25.17 0-15.01-10.15-25.18-10.16-10.17-25.17-10.17-15.01 0-25.18 10.16-10.16 10.15-10.16 25.17 0 15.01 10.15 25.17Q464.98-280 479.99-280Zm-31.32-155.33h66.66V-684h-66.66v248.67ZM480.18-80q-82.83 0-155.67-31.5-72.84-31.5-127.18-85.83Q143-251.67 111.5-324.56T80-480.33q0-82.88 31.5-155.78Q143-709 197.33-763q54.34-54 127.23-85.5T480.33-880q82.88 0 155.78 31.5Q709-817 763-763t85.5 127Q880-563 880-480.18q0 82.83-31.5 155.67Q817-251.67 763-197.46q-54 54.21-127 85.84Q563-80 480.18-80Zm.15-66.67q139 0 236-97.33t97-236.33q0-139-96.87-236-96.88-97-236.46-97-138.67 0-236 96.87-97.33 96.88-97.33 236.46 0 138.67 97.33 236 97.33 97.33 236.33 97.33ZM480-480Z" />
                </svg>
            )
        }
        return null
    }

    return (
        <div className="status-page">
            <h1>Sportini Cleani</h1>
            <div className="status-content">
                <div className="status-inventory">
                    <div className="inventory-header">
                        <h2>Inventory</h2>
                        <div className="inventory-unit">
                            <p>Last Session</p>
                            <p>Inv.</p>
                        </div>
                    </div>

                    <div className="inventory-ball-box">
                        {types.map(t => {
                            const sessionCount = (itemsByType[t.id] || {}).count || 0
                            const expectedCount = (invByType[t.id] || {}).expected_count || 0

                            return (
                                <div className="inventory-ball" key={t.id}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill={t.color}>
                                        {/* reuse same SVGs as before */}
                                        {t.id === 1 && <path d="M148-513.33h129.33q-6.66-44.67-26.33-84-19.67-39.34-49-68.67-21.33 33-36.17 71.17Q151-556.67 148-513.33Zm534.67 0H812q-3-43.34-17.83-81.5Q779.33-633 758-666q-31.33 31.33-50 69.67-18.67 38.33-25.33 83ZM202-294.67Q233.33-326 252-364t25.33-82.67H148q3 43.34 17.83 81.17 14.84 37.83 36.17 70.83Zm556 0q21.33-33 36.17-70.83Q809-403.33 812-446.67H682.67Q689.33-402 708-364q18.67 38 50 69.33ZM345.33-513.33h101.34V-812q-59 7.33-109.84 31.17-50.83 23.83-91.5 63.5 40.34 40 66.17 92.16 25.83 52.17 33.83 111.84Zm168 0h101.34q8-59.67 34.16-111.84 26.17-52.16 66.5-92.16-40.66-39.67-91.83-63.5-51.17-23.84-110.17-31.17v298.67ZM446.67-148v-298.67H345.33q-8 59.67-33.83 111.5-25.83 51.84-66.17 91.84 40.67 39.66 89.84 63.83 49.16 24.17 111.5 31.5Zm66.66 0q62.34-7.33 111.84-31.5t90.16-63.83q-40.33-40-66.5-91.84-26.16-51.83-34.16-111.5H513.33V-148ZM480-476.67ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />}
                                        {t.id === 2 && <path d="M480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-155.67 31.5-72.66 85.83-127Q251.67-817 324.67-848.5T480-880q83 0 155.67 31.5 72.66 31.5 127 85.83 54.33 54.34 85.83 127Q880-563 880-480q0 82.33-31.5 155.33-31.5 73-85.83 127.34-54.34 54.33-127 85.83Q563-80 480-80Zm203.33-495.33 64-22L764.67-658q-33.34-51.33-81.67-87.83t-108.33-55.5L513.33-760v65.33l170 119.34Zm-406 0 169.34-119.34V-760L386-801.33q-60 19-108.33 55.5Q229.33-709.33 196-658l20 60.67 61.33 22Zm-50 316 55.34-6 36-61.34L258-512l-66-22.67-45.33 36q0 69.67 16.66 127.17 16.67 57.5 64 112.17ZM480-146.67q26.67 0 53.33-4.66Q560-156 588-164l31.33-68-30-51.33h-218l-30 51.33 31.34 68q25.33 8 53 12.67 27.66 4.66 54.33 4.66ZM379.33-350H578l59.33-175.33-157.33-112-158.67 112 58 175.33Zm354 90.67Q780-314 796.67-371.5q16.66-57.5 16.66-127.17L768-530l-65.33 18L642-326.67l35.33 61.34 56 6Z" />}
                                        {t.id === 3 && <path d="M798-580q-29.67-93.67-106-157.5T513.33-812v67.33L798-580ZM304.67-419.33l142-83.34V-812q-38 4.33-73.67 16.17-35.67 11.83-68.33 32.5v344Zm-128.67 76L238-380v-329.33Q193.67-662.67 170.17-603t-23.5 123q0 36.67 7.5 70.17t21.83 66.5ZM322.67-186l302-174L480-444.67 208.67-285.33Q231.33-255 260-229q28.67 26 62.67 43ZM480-146.67q82.33 0 153.33-37 71-37 118-102.33L690-321.33l-286 166q18.67 4.33 38 6.5 19.33 2.16 38 2.16ZM784-344q16.33-35 23.17-71.5Q814-452 813.33-492l-300-174.67v164L784-344ZM480-480Zm0 400q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />}
                                    </svg>

                                    <p>{t.name}</p>
                                    {renderWarning(sessionCount, expectedCount)}

                                    <div className="inventory-ball-values">
                                        <p>{session ? sessionCount : '—'}</p>
                                        <p>/</p>
                                        <p>{expectedCount}</p>
                                    </div>
                                </div>
                            )
                        })}

                        <div className='inventory-total'>
                            <button className="edit-button" onClick={() => setModalOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="24px" fill={editColor}>
                                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z" />
                                </svg>
                            </button>
                            <div className="inventory-total-right">
                                <div className="inventory-divider-line" />
                                <div className="inventory-total-text">
                                    <p className="total">total</p>
                                    <div className="inventory-total-values">
                                        <p>{session ? totalSession : '—'}</p>
                                        <p>/</p>
                                        <p>{totalExpected}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='empty'></div>
            </div>

            <InventoryModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                inventory={inventory}
                onSave={handleSaveInventory}
            />
        </div>
    )
}

export default InventoryPage
