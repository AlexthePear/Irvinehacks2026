import { useState } from "react";
import "./LiveDisplay.css";

const fmt = (value) =>
  (value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function LiveDisplay({
  isMonthly,
  onTogglePeriod,
  grossIncome,
  adjustedGrossIncome,
  deductionsSaved,
  investmentsTotal,
  pretaxTotal,
  afterTaxAdvantaged,
  afterTaxCustom,
  takeHomePay,
  taxDetails
}) {
  const [showMore, setShowMore] = useState(false);
  const [showInvestMore, setShowInvestMore] = useState(false);

  return (
    <div className="live-display">
      <div className="period-toggle">
        <span className={!isMonthly ? "period-label active" : "period-label"}>
          Annual
        </span>
        <label className="switch">
          <input
            type="checkbox"
            checked={isMonthly}
            onChange={onTogglePeriod}
          />
          <span className="slider"></span>
        </label>
        <span className={isMonthly ? "period-label active" : "period-label"}>
          Monthly
        </span>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Gross Income</p>
          <p className="metric-value">${fmt(grossIncome)}</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Adjusted Gross Income</p>
          <p className="metric-value">${fmt(adjustedGrossIncome)}</p>
          <p className="metric-sub positive">
            Saved ${fmt(deductionsSaved)} in deductions
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Investments</p>
          <p className="metric-value">${fmt(investmentsTotal)}</p>
          <p className="metric-sub positive">
            Pretax savings: ${fmt(pretaxTotal)}
          </p>
          <p className="metric-sub positive">
            Tax-advantaged after-tax: ${fmt(afterTaxAdvantaged)}
          </p>
          <p className="metric-sub positive">
            After-tax custom savings: ${fmt(afterTaxCustom)}
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Take Home Pay</p>
          <p className="metric-value">${fmt(takeHomePay)}</p>
          <p className="metric-sub negative">
            Paid ${fmt(taxDetails?.total || 0)} in taxes
          </p>
          <button
            type="button"
            className="show-more-button"
            onClick={() => setShowMore((prev) => !prev)}
          >
            {showMore ? "Hide breakdown" : "Show more"}
          </button>
          {showMore && (
            <div className="tax-breakdown">
              <div className="tax-row">
                <span>Federal</span>
                <span>${fmt(taxDetails?.federal || 0)}</span>
              </div>
              <div className="tax-row">
                <span>State</span>
                <span>${fmt(taxDetails?.state || 0)}</span>
              </div>
              <div className="tax-row">
                <span>FICA</span>
                <span>${fmt(taxDetails?.fica || 0)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveDisplay;
