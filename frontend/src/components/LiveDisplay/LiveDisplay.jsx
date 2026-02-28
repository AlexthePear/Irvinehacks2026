import { useState } from "react";
import "./LiveDisplay.css";

function LiveDisplay({ totalIncome, remainingIncome }) {
  const [isMonthly, setIsMonthly] = useState(false);

  const displayIncome = isMonthly
    ? totalIncome / 12
    : totalIncome;

  const displayRemaining = isMonthly
    ? remainingIncome / 12
    : remainingIncome;

  const incomeLabel = isMonthly ? "Monthly Income" : "Annual Income";
  const remainingLabel = isMonthly ? "Monthly Remaining" : "Annual Remaining";

  return (
    <div className="live-salary-container">
      <div className="salary-boxes">
        <div className="salary-box">
          <h4>{remainingLabel}</h4>
          <p>
            $
            {displayRemaining.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>

        <div className="salary-box">
          <h4>{incomeLabel}</h4>
          <p>
            $
            {displayIncome.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
      </div>

      <div className="toggle-switch">
        <span style={{ fontWeight: !isMonthly ? "bold" : "normal" }}>
          Annual
        </span>

        <label className="switch">
          <input
            type="checkbox"
            checked={isMonthly}
            onChange={() => setIsMonthly(!isMonthly)}
          />
          <span className="slider"></span>
        </label>

        <span style={{ fontWeight: isMonthly ? "bold" : "normal" }}>
          Monthly
        </span>
      </div>
    </div>
  );
}

export default LiveDisplay;