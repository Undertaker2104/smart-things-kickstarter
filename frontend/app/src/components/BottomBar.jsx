import './BottomBar.css'
import '../theme/colors.css'
import StatusIcon from "../assets/icons/status.svg"
import ChartIcon from "../assets/icons/chart.svg"
import InventoryIcon from "../assets/icons/inventory.svg"

const BottomBar = () => {
    return (
        <div className="bottom-bar">
            <div className="botTop">
                <div className="ctrl-buttons-container">
                    <button className='pauseBut'>
                        <span className="butText">Pause Session</span>
                    </button>
                    <button className='stopBut'>
                        <span className="butText">Stop Session</span>
                    </button>
                </div>
            </div>
            <div className="botBot">
                <div className="btm-buttons-container">
                    <button className='btmBut'>
                        <img src={InventoryIcon} alt="Inventory" className="icon" />
                        <span className="label">Inventory</span>
                    </button>
                    <button className='btmBut'>
                        <img src={StatusIcon} alt="Status" className="icon" />
                        <span className="label">Status</span>
                    </button>
                    <button className='btmBut'>
                        <img src={ChartIcon} alt="Chart" className="icon" />
                        <span className="label">Data</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


export default BottomBar
