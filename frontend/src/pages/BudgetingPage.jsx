import LiveDisplay from "../components/LiveDisplay/LiveDisplay";

function BudgetingPage({
  activeTab,
  onTabChange,
  tabs,
  renderAiPanel,
  renderStandardFields,
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
  spendingBreakdown,
  taxDetails
}) {
  return (
    <div id="budgeting-page" className="page-shell budgeting-page" role="tabpanel" aria-label="Budgeting">
      <LiveDisplay
        isMonthly={isMonthly}
        onTogglePeriod={onTogglePeriod}
        grossIncome={grossIncome}
        adjustedGrossIncome={adjustedGrossIncome}
        deductionsSaved={deductionsSaved}
        investmentsTotal={investmentsTotal}
        pretaxTotal={pretaxTotal}
        afterTaxAdvantaged={afterTaxAdvantaged}
        afterTaxCustom={afterTaxCustom}
        takeHomePay={takeHomePay}
        spendingBreakdown={spendingBreakdown}
        taxDetails={taxDetails}
      />

      <div className="panel-shell">
        <div className="tab-row">
          {tabs.map((tab) => (
            <label
              className={`tab-toggle ${tab.variant === "ai" ? "tab-toggle-ai" : ""}`}
              key={tab.id}
            >
              <input
                type="radio"
                name="budgeting-tabs"
                checked={activeTab === tab.id}
                onChange={() => onTabChange(tab.id)}
              />
              <span>{tab.label}</span>
            </label>
          ))}
        </div>

        <div className={`settings-window ${activeTab === "ai" ? "settings-window-ai" : ""}`}>
          {activeTab === "ai" ? renderAiPanel() : renderStandardFields()}
        </div>
      </div>
    </div>
  );
}

export default BudgetingPage;
