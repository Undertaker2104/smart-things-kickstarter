import './StatusPage.css'
import '../theme/colors.css'

const status = "Cleaning";
const basketballColor = "var(--basketball)";
const footballColor = "var(--football)";
const volleyballColor = "var(--volleyball)";

const StatusPage = () => {
    return (
        <div className="status-page">
            <h1>Sportini Cleani</h1>
            <div className="status-card">
                <h2>Status: {status} </h2>
                <div className="status-bar" />
            </div>
            <div className="status-content">
                <div className="status-session">
                    <div className="session-header">
                        <h2>Current Session</h2>
                        <div className="session-unit">
                            <p>Error</p>
                            <p>Nr.</p>
                        </div>
                    </div>
                    <div className="session-ball-box">
                        <div className="session-ball">
                            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill={basketballColor}>
                                <path d="M148-513.33h129.33q-6.66-44.67-26.33-84-19.67-39.34-49-68.67-21.33 33-36.17 71.17Q151-556.67 148-513.33Zm534.67 0H812q-3-43.34-17.83-81.5Q779.33-633 758-666q-31.33 31.33-50 69.67-18.67 38.33-25.33 83ZM202-294.67Q233.33-326 252-364t25.33-82.67H148q3 43.34 17.83 81.17 14.84 37.83 36.17 70.83Zm556 0q21.33-33 36.17-70.83Q809-403.33 812-446.67H682.67Q689.33-402 708-364q18.67 38 50 69.33ZM345.33-513.33h101.34V-812q-59 7.33-109.84 31.17-50.83 23.83-91.5 63.5 40.34 40 66.17 92.16 25.83 52.17 33.83 111.84Zm168 0h101.34q8-59.67 34.16-111.84 26.17-52.16 66.5-92.16-40.66-39.67-91.83-63.5-51.17-23.84-110.17-31.17v298.67ZM446.67-148v-298.67H345.33q-8 59.67-33.83 111.5-25.83 51.84-66.17 91.84 40.67 39.66 89.84 63.83 49.16 24.17 111.5 31.5Zm66.66 0q62.34-7.33 111.84-31.5t90.16-63.83q-40.33-40-66.5-91.84-26.16-51.83-34.16-111.5H513.33V-148ZM480-476.67ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
                            </svg>
                            <p>Basketballs</p>
                            <div className="ball-values">
                                <p>2</p>
                                <p>14</p>
                            </div>
                        </div>
                        <div className="session-ball">
                            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill={footballColor}>
                                <path d="M480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-155.67 31.5-72.66 85.83-127Q251.67-817 324.67-848.5T480-880q83 0 155.67 31.5 72.66 31.5 127 85.83 54.33 54.34 85.83 127Q880-563 880-480q0 82.33-31.5 155.33-31.5 73-85.83 127.34-54.34 54.33-127 85.83Q563-80 480-80Zm203.33-495.33 64-22L764.67-658q-33.34-51.33-81.67-87.83t-108.33-55.5L513.33-760v65.33l170 119.34Zm-406 0 169.34-119.34V-760L386-801.33q-60 19-108.33 55.5Q229.33-709.33 196-658l20 60.67 61.33 22Zm-50 316 55.34-6 36-61.34L258-512l-66-22.67-45.33 36q0 69.67 16.66 127.17 16.67 57.5 64 112.17ZM480-146.67q26.67 0 53.33-4.66Q560-156 588-164l31.33-68-30-51.33h-218l-30 51.33 31.34 68q25.33 8 53 12.67 27.66 4.66 54.33 4.66ZM379.33-350H578l59.33-175.33-157.33-112-158.67 112 58 175.33Zm354 90.67Q780-314 796.67-371.5q16.66-57.5 16.66-127.17L768-530l-65.33 18L642-326.67l35.33 61.34 56 6Z"/>
                            </svg>
                            <p>Soccer Balls</p>
                            <div className="ball-values">
                                <p>1</p>
                                <p>9</p>
                            </div>
                        </div>
                        <div className="session-ball">
                            <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill={volleyballColor}>
                                <path d="M798-580q-29.67-93.67-106-157.5T513.33-812v67.33L798-580ZM304.67-419.33l142-83.34V-812q-38 4.33-73.67 16.17-35.67 11.83-68.33 32.5v344Zm-128.67 76L238-380v-329.33Q193.67-662.67 170.17-603t-23.5 123q0 36.67 7.5 70.17t21.83 66.5ZM322.67-186l302-174L480-444.67 208.67-285.33Q231.33-255 260-229q28.67 26 62.67 43ZM480-146.67q82.33 0 153.33-37 71-37 118-102.33L690-321.33l-286 166q18.67 4.33 38 6.5 19.33 2.16 38 2.16ZM784-344q16.33-35 23.17-71.5Q814-452 813.33-492l-300-174.67v164L784-344ZM480-480Zm0 400q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
                            </svg>
                            <p>Volleyballs</p>
                            <div className="ball-values">
                                <p>5</p>
                                <p>22</p>
                            </div>
                        </div>
                    </div>
                    <div className='session-total'>
                        <div className="divider-line" />
                        <div className="total-text">
                            <p>total</p>
                            <div className="total-values">
                                <p>8</p>
                                <p>45</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='empty'></div>
            </div>
        </div>
    )
}

export default StatusPage
