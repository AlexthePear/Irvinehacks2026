import { useEffect, useMemo, useState } from "react";

const baseAccounts = [
  { key: "401k", label: "401k" },
  { key: "IRA", label: "IRA" },
  { key: "HSA", label: "HSA" },
  { key: "Back Door", label: "Back Door IRA" },
  { key: "Roth 401k", label: "Roth 401k" },
  { key: "Roth IRA", label: "Roth IRA" },
  { key: "529", label: "529" }
];

const accountColors = [
  "#2df7e6",
  "#ff4f8b",
  "#ffd166",
  "#5ea1ff",
  "#7fffd4",
  "#ff8fab",
  "#89f0ff",
  "#f8ff7a"
];

const toNumber = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const periodsPerYearFor = (cadence) => (cadence === "monthly" ? 12 : 26);

const formatUsd = (value) =>
  `$${roundTwo(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatUsdTick = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${roundTwo(value).toFixed(0)}`;
};

const niceMax = (value) => {
  if (value <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(value));
  const base = value / 10 ** exponent;
  let niceBase = 10;
  if (base <= 1) {
    niceBase = 1;
  } else if (base <= 2) {
    niceBase = 2;
  } else if (base <= 5) {
    niceBase = 5;
  }
  return niceBase * 10 ** exponent;
};

const axisYTicks = (maxValue, count = 5) => {
  const step = maxValue / count;
  return Array.from({ length: count + 1 }, (_, idx) => roundTwo(idx * step));
};

const axisXTicks = (maxYears, count = 6) => {
  const ticks = new Set([0, maxYears]);
  for (let idx = 1; idx < count; idx += 1) {
    ticks.add(Math.round((idx / count) * maxYears));
  }
  return Array.from(ticks).sort((a, b) => a - b);
};

const buildSingleProjection = (settings) => {
  const horizon = Math.max(1, Math.round(toNumber(settings.timeHorizon)));
  const startingAmount = Math.max(0, toNumber(settings.startingAmount));
  const returnRate = Math.max(0, toNumber(settings.returnRate)) / 100;
  const additionalContribution = Math.max(0, toNumber(settings.additionalContribution));
  const periodsPerYear = periodsPerYearFor(settings.contributionCadence);
  const periodRate = returnRate / periodsPerYear;

  const points = [{ year: 0, principal: startingAmount, total: startingAmount }];
  let principal = startingAmount;
  let total = startingAmount;

  for (let year = 1; year <= horizon; year += 1) {
    for (let period = 0; period < periodsPerYear; period += 1) {
      total *= 1 + periodRate;
      total += additionalContribution;
      principal += additionalContribution;
    }
    points.push({ year, principal, total });
  }

  return points;
};

function SingleAccountChart({ title, points }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!points.length) {
    return null;
  }

  const width = 980;
  const height = 360;
  const pad = { top: 24, right: 20, bottom: 54, left: 96 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const maxYears = points[points.length - 1].year;
  const maxValue = niceMax(Math.max(...points.map((point) => point.total)));
  const yTicks = axisYTicks(maxValue);
  const xTicks = axisXTicks(maxYears);

  const xFor = (year) => pad.left + (year / Math.max(1, maxYears)) * chartWidth;
  const yFor = (value) => pad.top + chartHeight - (value / maxValue) * chartHeight;
  const baseY = pad.top + chartHeight;

  const principalLine = points
    .map((point) => `${xFor(point.year)},${yFor(point.principal)}`)
    .join(" ");
  const totalLine = points.map((point) => `${xFor(point.year)},${yFor(point.total)}`).join(" ");

  const principalArea = [
    `M ${xFor(0)} ${baseY}`,
    ...points.map((point) => `L ${xFor(point.year)} ${yFor(point.principal)}`),
    `L ${xFor(maxYears)} ${baseY}`,
    "Z"
  ].join(" ");

  const interestArea = [
    `M ${xFor(0)} ${yFor(points[0].total)}`,
    ...points.map((point) => `L ${xFor(point.year)} ${yFor(point.total)}`),
    `L ${xFor(maxYears)} ${yFor(points[points.length - 1].principal)}`,
    ...points
      .slice()
      .reverse()
      .map((point) => `L ${xFor(point.year)} ${yFor(point.principal)}`),
    "Z"
  ].join(" ");

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const relative = clamp((svgX - pad.left) / chartWidth, 0, 1);
    const nearestIndex = Math.round(relative * maxYears);
    setHoverIndex(clamp(nearestIndex, 0, maxYears));
  };

  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex];
  const tooltipWidth = 170;
  const tooltipHeight = 58;
  const tooltipX = hoveredPoint
    ? clamp(xFor(hoveredPoint.year) + 10, pad.left + 8, pad.left + chartWidth - tooltipWidth - 8)
    : 0;
  const tooltipY = hoveredPoint
    ? clamp(yFor(hoveredPoint.total) - 64, pad.top + 8, pad.top + chartHeight - tooltipHeight - 8)
    : 0;

  return (
    <div className="chart-block">
      <h3 className="chart-title">{title}</h3>
      <svg
        className="investment-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title} projection chart`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="principalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(45, 247, 230, 0.55)" />
            <stop offset="100%" stopColor="rgba(45, 247, 230, 0.07)" />
          </linearGradient>
          <linearGradient id="interestFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 79, 139, 0.5)" />
            <stop offset="100%" stopColor="rgba(255, 79, 139, 0.07)" />
          </linearGradient>
        </defs>

        <rect
          x={pad.left}
          y={pad.top}
          width={chartWidth}
          height={chartHeight}
          rx="14"
          className="investment-chart-frame"
        />

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              y1={yFor(tick)}
              x2={pad.left + chartWidth}
              y2={yFor(tick)}
              className="chart-grid-line"
            />
            <text
              x={pad.left - 14}
              y={yFor(tick) + 4}
              className="chart-axis-tick chart-axis-tick-y"
            >
              {formatUsdTick(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xFor(tick)}
              y1={pad.top}
              x2={xFor(tick)}
              y2={pad.top + chartHeight}
              className="chart-grid-line"
            />
            <text
              x={xFor(tick)}
              y={pad.top + chartHeight + 20}
              textAnchor="middle"
              className="chart-axis-tick"
            >
              {tick}y
            </text>
          </g>
        ))}

        <path d={principalArea} fill="url(#principalFill)" />
        <path d={interestArea} fill="url(#interestFill)" />
        <polyline points={principalLine} fill="none" className="investment-chart-principal-line" />
        <polyline points={totalLine} fill="none" className="investment-chart-line" />

        {hoveredPoint && (
          <>
            <line
              x1={xFor(hoveredPoint.year)}
              y1={pad.top}
              x2={xFor(hoveredPoint.year)}
              y2={pad.top + chartHeight}
              className="chart-hover-line"
            />
            <circle
              cx={xFor(hoveredPoint.year)}
              cy={yFor(hoveredPoint.total)}
              r="5"
              className="chart-hover-dot"
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx="8"
              className="chart-tooltip-bg"
            />
            <text x={tooltipX + 10} y={tooltipY + 20} className="chart-tooltip-text">
              {`x: ${hoveredPoint.year} years`}
            </text>
            <text x={tooltipX + 10} y={tooltipY + 36} className="chart-tooltip-text">
              {`y: ${formatUsd(hoveredPoint.total)} USD`}
            </text>
          </>
        )}

        <text
          x={pad.left + chartWidth / 2}
          y={height - 14}
          textAnchor="middle"
          className="chart-axis-title"
        >
          Time (Years)
        </text>
        <text
          x={24}
          y={pad.top + chartHeight / 2}
          textAnchor="middle"
          className="chart-axis-title"
          transform={`rotate(-90 24 ${pad.top + chartHeight / 2})`}
        >
          Portfolio Value (USD)
        </text>
      </svg>
      <div className="chart-legend">
        <span className="legend-item principal">Principal / Contributions</span>
        <span className="legend-item interest">Interest</span>
      </div>
    </div>
  );
}

function MasterChart({ accountSeries, totalSeries, maxYears }) {
  const [hoverYear, setHoverYear] = useState(null);

  if (!accountSeries.length) {
    return null;
  }

  const width = 980;
  const height = 360;
  const pad = { top: 24, right: 20, bottom: 54, left: 96 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const maxSeriesValue = Math.max(
    ...accountSeries.flatMap((series) => series.points.map((point) => point.total)),
    ...totalSeries.map((point) => point.total)
  );
  const maxValue = niceMax(maxSeriesValue);
  const yTicks = axisYTicks(maxValue);
  const xTicks = axisXTicks(maxYears);

  const xFor = (year) => pad.left + (year / Math.max(1, maxYears)) * chartWidth;
  const yFor = (value) => pad.top + chartHeight - (value / maxValue) * chartHeight;

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const relative = clamp((svgX - pad.left) / chartWidth, 0, 1);
    const nearestYear = Math.round(relative * maxYears);
    setHoverYear(clamp(nearestYear, 0, maxYears));
  };

  const hoveredTotal = hoverYear === null ? null : totalSeries[hoverYear];
  const hoverSeriesValues =
    hoverYear === null
      ? []
      : accountSeries.map((series) => ({
          label: series.label,
          color: series.color,
          value: series.points[hoverYear].total
        }));
  const tooltipLines =
    hoveredTotal === null
      ? []
      : [
          `x: ${hoveredTotal.year} years`,
          `Total: ${formatUsd(hoveredTotal.total)}`
        ].concat(hoverSeriesValues.map((entry) => `${entry.label}: ${formatUsd(entry.value)}`));
  const tooltipWidth = 250;
  const tooltipHeight = tooltipLines.length * 14 + 12;
  const tooltipX =
    hoveredTotal === null
      ? 0
      : clamp(xFor(hoveredTotal.year) + 10, pad.left + 8, pad.left + chartWidth - tooltipWidth - 8);
  const tooltipY =
    hoveredTotal === null
      ? 0
      : clamp(yFor(hoveredTotal.total) - tooltipHeight - 10, pad.top + 8, pad.top + chartHeight - tooltipHeight - 8);

  return (
    <div className="chart-block">
      <h3 className="chart-title">Master Projection (All Accounts)</h3>
      <svg
        className="investment-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Master account projection chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverYear(null)}
      >
        <rect
          x={pad.left}
          y={pad.top}
          width={chartWidth}
          height={chartHeight}
          rx="14"
          className="investment-chart-frame"
        />

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              y1={yFor(tick)}
              x2={pad.left + chartWidth}
              y2={yFor(tick)}
              className="chart-grid-line"
            />
            <text
              x={pad.left - 14}
              y={yFor(tick) + 4}
              className="chart-axis-tick chart-axis-tick-y"
            >
              {formatUsdTick(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xFor(tick)}
              y1={pad.top}
              x2={xFor(tick)}
              y2={pad.top + chartHeight}
              className="chart-grid-line"
            />
            <text
              x={xFor(tick)}
              y={pad.top + chartHeight + 20}
              textAnchor="middle"
              className="chart-axis-tick"
            >
              {tick}y
            </text>
          </g>
        ))}

        {accountSeries.map((series) => (
          <polyline
            key={series.id}
            points={series.points
              .map((point) => `${xFor(point.year)},${yFor(point.total)}`)
              .join(" ")}
            fill="none"
            stroke={series.color}
            strokeWidth="2.1"
            className="master-line"
          />
        ))}

        <polyline
          points={totalSeries
            .map((point) => `${xFor(point.year)},${yFor(point.total)}`)
            .join(" ")}
          fill="none"
          className="master-line-total"
        />

        {hoveredTotal && (
          <>
            <line
              x1={xFor(hoveredTotal.year)}
              y1={pad.top}
              x2={xFor(hoveredTotal.year)}
              y2={pad.top + chartHeight}
              className="chart-hover-line"
            />
            {hoverSeriesValues.map((entry, idx) => (
              <circle
                key={`hover-dot-${entry.label}`}
                cx={xFor(hoveredTotal.year)}
                cy={yFor(accountSeries[idx].points[hoveredTotal.year].total)}
                r="3"
                fill={entry.color}
              />
            ))}
            <circle
              cx={xFor(hoveredTotal.year)}
              cy={yFor(hoveredTotal.total)}
              r="5"
              className="chart-hover-dot"
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx="8"
              className="chart-tooltip-bg"
            />
            {tooltipLines.map((line, idx) => (
              <text
                key={`tip-${line}`}
                x={tooltipX + 10}
                y={tooltipY + 20 + idx * 14}
                className={`chart-tooltip-text ${idx === 1 ? "chart-tooltip-text-total" : ""}`}
              >
                {line}
              </text>
            ))}
          </>
        )}

        <text
          x={pad.left + chartWidth / 2}
          y={height - 14}
          textAnchor="middle"
          className="chart-axis-title"
        >
          Time (Years)
        </text>
        <text
          x={24}
          y={pad.top + chartHeight / 2}
          textAnchor="middle"
          className="chart-axis-title"
          transform={`rotate(-90 24 ${pad.top + chartHeight / 2})`}
        >
          Portfolio Value (USD)
        </text>
      </svg>

      <div className="chart-legend">
        {accountSeries.map((series) => (
          <span key={series.id} className="legend-item legend-account">
            <span className="legend-chip" style={{ background: series.color }}></span>
            {series.label}
          </span>
        ))}
        <span className="legend-item legend-account">
          <span className="legend-chip legend-chip-total"></span>
          Total
        </span>
      </div>
    </div>
  );
}

function InvestmentsPage({ savings, isMonthly }) {
  const accounts = useMemo(() => {
    const derived = [];

    baseAccounts.forEach((account) => {
      const rawAmount = toNumber(savings?.[account.key]);
      if (rawAmount <= 0) {
        return;
      }

      const monthlyContribution = isMonthly ? rawAmount : rawAmount / 12;
      derived.push({
        id: account.key,
        label: account.label,
        monthlyContribution: roundTwo(monthlyContribution)
      });
    });

    (savings?.CustomAccounts || []).forEach((acct, idx) => {
      const rawAmount = toNumber(acct?.amount);
      const monthlyContribution = isMonthly ? rawAmount : rawAmount / 12;
      derived.push({
        id: `custom-${idx}`,
        label: (acct?.name || `Custom Account ${idx + 1}`).trim(),
        monthlyContribution: roundTwo(monthlyContribution)
      });
    });

    return derived.map((account, idx) => ({
      ...account,
      color: accountColors[idx % accountColors.length]
    }));
  }, [isMonthly, savings]);

  const [accountSettings, setAccountSettings] = useState({});
  const [selectedAccountId, setSelectedAccountId] = useState("");

  useEffect(() => {
    setAccountSettings((prev) => {
      const next = { ...prev };
      const ids = new Set(accounts.map((account) => account.id));

      accounts.forEach((account) => {
        if (!next[account.id]) {
          next[account.id] = {
            timeHorizon: "30",
            startingAmount: "0.00",
            returnRate: "7.00",
            additionalContribution: (account.monthlyContribution / 2).toFixed(2),
            contributionCadence: "biweekly"
          };
        }
      });

      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
        }
      });

      return next;
    });
  }, [accounts]);

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId("");
      return;
    }
    const exists = accounts.some((account) => account.id === selectedAccountId);
    if (!exists) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const updateSetting = (accountId, field, value) => {
    setAccountSettings((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: value
      }
    }));
  };

  const normalizeMoneyField = (accountId, field) => {
    const value = toNumber(accountSettings[accountId]?.[field]);
    updateSetting(accountId, field, roundTwo(Math.max(0, value)).toFixed(2));
  };

  const projectionsByAccount = useMemo(() => {
    const next = {};
    accounts.forEach((account) => {
      const settings = accountSettings[account.id];
      if (!settings) {
        return;
      }
      next[account.id] = buildSingleProjection(settings);
    });
    return next;
  }, [accountSettings, accounts]);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) || null;
  const selectedPoints = selectedAccount
    ? projectionsByAccount[selectedAccount.id] || []
    : [];

  const masterProjection = useMemo(() => {
    if (!accounts.length) {
      return { accountSeries: [], totalSeries: [], maxYears: 1 };
    }

    const accountSeries = accounts.map((account) => {
      const rawPoints = projectionsByAccount[account.id] || [];
      const lastPoint = rawPoints[rawPoints.length - 1] || { year: 0, total: 0 };
      return {
        id: account.id,
        label: account.label,
        color: account.color,
        rawPoints,
        lastPoint
      };
    });

    const maxYears = Math.max(
      1,
      ...accountSeries.map(
        (series) => series.rawPoints[series.rawPoints.length - 1]?.year || 1
      )
    );

    const normalized = accountSeries.map((series) => {
      const points = [];
      for (let year = 0; year <= maxYears; year += 1) {
        if (year < series.rawPoints.length) {
          points.push({ year, total: series.rawPoints[year].total });
        } else {
          points.push({ year, total: series.lastPoint.total });
        }
      }
      return {
        id: series.id,
        label: series.label,
        color: series.color,
        points
      };
    });

    const totalSeries = [];
    for (let year = 0; year <= maxYears; year += 1) {
      const total = normalized.reduce(
        (sum, series) => sum + series.points[year].total,
        0
      );
      totalSeries.push({ year, total });
    }

    return { accountSeries: normalized, totalSeries, maxYears };
  }, [accounts, projectionsByAccount]);

  return (
    <div
      id="investments-page"
      className="investments-page"
      role="tabpanel"
      aria-label="Investments"
    >
      <div className="panel-shell">
        <div className="page-header">
          <div>
            <p className="page-kicker">Investments</p>
            <h2 className="page-title">
              Forecast by account using your budgeting contributions.
            </h2>
          </div>
          <div className="page-badge">Forecast</div>
        </div>

        <div className="settings-window">
          {!accounts.length ? (
            <div className="empty-investments">
              Add values in Budgeting → Savings to generate account forecasts.
            </div>
          ) : (
            <div className="investment-rows">
              {accounts.map((account) => {
                const settings = accountSettings[account.id];
                if (!settings) {
                  return null;
                }

                return (
                  <div className="investment-row" key={account.id}>
                    <div className="investment-row-header">
                      <h3>{account.label}</h3>
                      <span>
                        Budget monthly contribution:{" "}
                        {formatUsd(account.monthlyContribution)} USD
                      </span>
                    </div>

                    <div className="investment-row-grid">
                      <div className="settings-field investment-field">
                        <label htmlFor={`${account.id}-horizon`}>
                          Time horizon (years)
                        </label>
                        <input
                          id={`${account.id}-horizon`}
                          type="number"
                          min="1"
                          value={settings.timeHorizon}
                          onChange={(event) =>
                            updateSetting(
                              account.id,
                              "timeHorizon",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="settings-field investment-field">
                        <label htmlFor={`${account.id}-starting`}>
                          Starting amount
                        </label>
                        <input
                          id={`${account.id}-starting`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={settings.startingAmount}
                          onChange={(event) =>
                            updateSetting(
                              account.id,
                              "startingAmount",
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            normalizeMoneyField(account.id, "startingAmount")
                          }
                        />
                      </div>

                      <div className="settings-field investment-field">
                        <label htmlFor={`${account.id}-rate`}>
                          Estimated return rate (%)
                        </label>
                        <input
                          id={`${account.id}-rate`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={settings.returnRate}
                          onChange={(event) =>
                            updateSetting(account.id, "returnRate", event.target.value)
                          }
                        />
                      </div>

                      <div className="settings-field investment-field">
                        <label htmlFor={`${account.id}-contrib`}>
                          Additional contribution amount
                        </label>
                        <input
                          id={`${account.id}-contrib`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={settings.additionalContribution}
                          onChange={(event) =>
                            updateSetting(
                              account.id,
                              "additionalContribution",
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            normalizeMoneyField(
                              account.id,
                              "additionalContribution"
                            )
                          }
                        />
                      </div>

                      <div className="settings-field investment-field">
                        <label htmlFor={`${account.id}-cadence`}>
                          Contribution cadence
                        </label>
                        <select
                          id={`${account.id}-cadence`}
                          value={settings.contributionCadence}
                          onChange={(event) =>
                            updateSetting(
                              account.id,
                              "contributionCadence",
                              event.target.value
                            )
                          }
                        >
                          <option value="biweekly">Biweekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel-shell investment-chart-shell">
        <div className="page-header">
          <div>
            <p className="page-kicker">Account Chart</p>
            <h2 className="page-title">
              Principal and interest for a selected account.
            </h2>
          </div>
          {!!accounts.length && (
            <div className="chart-selector">
              <label htmlFor="account-graph-picker">Show account</label>
              <select
                id="account-graph-picker"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="investment-chart-wrapper">
          {!selectedAccount ? (
            <div className="empty-investments">No account data to display.</div>
          ) : (
            <SingleAccountChart
              title={`${selectedAccount.label} Forecast`}
              points={selectedPoints}
            />
          )}
        </div>
      </div>

      <div className="panel-shell investment-chart-shell">
        <div className="page-header">
          <div>
            <p className="page-kicker">Master Chart</p>
            <h2 className="page-title">
              Aggregated account projection and combined total.
            </h2>
          </div>
        </div>

        <div className="investment-chart-wrapper">
          {!masterProjection.accountSeries.length ? (
            <div className="empty-investments">No account data to display.</div>
          ) : (
            <MasterChart
              accountSeries={masterProjection.accountSeries}
              totalSeries={masterProjection.totalSeries}
              maxYears={masterProjection.maxYears}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default InvestmentsPage;
