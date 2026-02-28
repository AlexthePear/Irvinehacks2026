import { useState } from "react";
import "./LiveDisplay.css";

function LiveSalary({ salary, expenses }) {
  const [isMonthly, setIsMonthly] = useState(false); // false = annual, true = monthly

  // Convert salary and remaining based on toggle
  const displaySalary = salary ? (isMonthly ? salary / 12 : salary) : 0;
  const remaining = salary && expenses ? salary - expenses : 0;
  const displayRemaining = isMonthly ? remaining / 12 : remaining;

  return (
    <div className="live-salary-container">
      <div className="salary-boxes">
        <div className="salary-box">
          <h4>Remaining</h4>
          <p>${displayRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="salary-box">
          <h4>Total Income</h4>
          <p>${displaySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="toggle-switch">
        <span style={{ fontWeight: !isMonthly ? "bold" : "normal" }}>Annual</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={isMonthly}
            onChange={() => setIsMonthly(!isMonthly)}
            aria-label="Toggle between annual and monthly salary"
          />
          <span className="slider"></span>
        </label>
        <span style={{ fontWeight: isMonthly ? "bold" : "normal" }}>Monthly</span>
      </div>
    </div>
  );
}

export default LiveSalary;