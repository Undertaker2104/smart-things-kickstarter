import { useState } from 'react'
import './BottomBar.css'
import '../theme/colors.css'
import StatusIcon from "../assets/icons/status.svg"
import ChartIcon from "../assets/icons/chart.svg"
import InventoryIcon from "../assets/icons/inventory.svg"

const BottomBar = () => {
  return (
    <div className="bottom-bar">
        <div className="btm-buttons-container">
            <button className='btmBut'>
                <img src={ChartIcon} alt="Chart" className="icon" />
                <span className="label">Data</span>
            </button>
            <button className='btmBut'>
                <img src={StatusIcon} alt="Status" className="icon" />
                <span className="label">Status</span>
            </button>
            <button className='btmBut'>
                <img src={InventoryIcon} alt="Inventory" className="icon" />
                <span className="label">Vooraad</span>
            </button>
      </div>
    </div>
  );
};


export default BottomBar
