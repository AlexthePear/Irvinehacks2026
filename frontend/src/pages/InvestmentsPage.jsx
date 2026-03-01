function InvestmentsPage() {
  return (
    <div id="investments-page" role="tabpanel" aria-label="Investments">
      <div className="panel-shell">
        <div className="page-header">
          <div>
            <p className="page-kicker">Investments</p>
            <h2 className="page-title">Growth scenarios and allocation tracking.</h2>
          </div>
          <div className="page-badge">Coming Online</div>
        </div>

        <div className="settings-window">
          <div className="page-grid">
            <div className="settings-field">
              <label htmlFor="inv-monthly">Monthly contribution</label>
              <input id="inv-monthly" type="text" placeholder="Enter amount" />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-return">Expected annual return</label>
              <input id="inv-return" type="text" placeholder="e.g. 7%" />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-horizon">Time horizon (years)</label>
              <input id="inv-horizon" type="number" placeholder="Enter years" />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-risk">Risk profile</label>
              <select id="inv-risk" defaultValue="">
                <option value="">Select profile</option>
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="growth">Growth</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestmentsPage;
