import { useEffect, useState } from "react";
import BudgetingPage from "./pages/BudgetingPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import {
  WriteToJson,
  ReadFromJson,
  CalcFederalTax,
  CalcStateTax,
  CalcFicaTax,
  GenerateInsights
} from "../wailsjs/go/main/App";
import "./App.css";

const pages = [
  { id: "budgeting", label: "Budgeting" },
  { id: "investments", label: "Investments" }
];

const budgetingTabs = [
  { id: "comp", label: "Compensation" },
  { id: "savings", label: "Savings" },
  { id: "expenses", label: "Expenses" },
  { id: "wants", label: "Wants" },
  { id: "career", label: "Career" },
  { id: "ai", label: "AI Insights", variant: "ai" }
];

const tabFields = {
  comp: ["Base Pay", "Bonus", "RSU", "Location (State)", "Filing Status", "Misc"],
  savings: [
    "401k",
    "IRA",
    "HSA",
    "Back Door",
    "Roth 401k",
    "Roth IRA",
    "529",
    { label: "Custom Accounts", dynamicSavings: true }
  ],
  expenses: [
    "Housing",
    "Groceries",
    "Utilities",
    "Transportation",
    "Healthcare",
    "Debt Payments",
    "Insurances"
  ],
  wants: ["Dining", "Entertainment", "Travel", { label: "Hobbies", dynamic: true }, 
    { label: "Subscriptions", dynamicExpenses: true }],
  career: ["Job Title", "Company", "Level", "Years of Experience"]
};

const initialState = {
  comp: {
    "Base Pay": "",
    Bonus: "",
    RSU: "",
    "Include RSU in Gross Income": false,
    "Location (State)": "",
    "Filing Status": "",
    Misc: ""
  },
  savings: {
    "401k": "",
    IRA: "",
    HSA: "",
    "Back Door": "",
    "Roth 401k": "",
    "Roth IRA": "",
    "529": "",
    CustomAccounts: []
  },
  expenses: {
    Housing: "",
    Groceries: "",
    Utilities: "",
    Transportation: "",
    Healthcare: "",
    "Debt Payments": "",
    Insurances: "",
    Subscriptions: []
  },
  wants: {
    Dining: "",
    Entertainment: "",
    Travel: "",
    Hobbies: []
  },
  career: {
    "Job Title": "",
    Company: "",
    Level: "",
    "Years of Experience": ""
  }
};

const defaultInsightPrompt = [
  "Review this financial planning profile and career context.",
  "Summarize the user's current position, identify notable risks or opportunities, and suggest practical next steps.",
  "Use short sections and bullet points when useful."
].join(" ");

const formatInsightText = (text) =>
  (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const normalizeLoadedState = (loaded) => {
  if (!loaded || typeof loaded !== "object") {
    return initialState;
  }

  const comp = loaded.comp || {};
  const savings = loaded.savings || {};
  const expenses = loaded.expenses || {};
  const wants = loaded.wants || {};
  const career = loaded.career || {};

  return {
    comp: {
      ...initialState.comp,
      ...comp,
      "Include RSU in Gross Income": Boolean(comp["Include RSU in Gross Income"])
    },
    savings: {
      ...initialState.savings,
      ...savings,
      CustomAccounts: Array.isArray(savings.CustomAccounts) ? savings.CustomAccounts : []
    },
    expenses: {
      ...initialState.expenses,
      ...expenses,
      Subscriptions: Array.isArray(expenses.Subscriptions) ? expenses.Subscriptions : []
    },
    wants: {
      ...initialState.wants,
      ...wants,
      Hobbies: Array.isArray(wants.Hobbies) ? wants.Hobbies : []
    },
    career: {
      ...initialState.career,
      ...career
    }
  };
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatInlineMarkdown = (text) => {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\*])\*([^\*]+)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");

  return html;
};

const renderMarkdownToHtml = (markdown) => {
  const lines = formatInsightText(markdown).split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    blocks.push(`<p>${formatInlineMarkdown(paragraphLines.join(" "))}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length || !listType) {
      return;
    }
    const items = listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join("");
    blocks.push(`<${listType}>${items}</${listType}>`);
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push(numberedMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.join("");
};

function App() {
  const [activePage, setActivePage] = useState(pages[0].id);
  const [activeTab, setActiveTab] = useState(budgetingTabs[0].id);
  const [values, setValues] = useState(initialState);
  const [draftValues, setDraftValues] = useState(initialState);
  const [isMonthly, setIsMonthly] = useState(false);
  const [taxDetails, setTaxDetails] = useState({
    federal: 0,
    state: 0,
    fica: 0,
    total: 0
  });
  const [aiPrompt, setAiPrompt] = useState(defaultInsightPrompt);
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const toNumber = (val) => Number(val || 0);
  const annualMultiplier = isMonthly ? 12 : 1;
  const displayDivisor = isMonthly ? 12 : 1;

  const persistValues = async (payload) => {
    try {
      await WriteToJson(payload);
    } catch (err) {
      console.error("Failed to write JSON", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateFromJson = async () => {
      try {
        const loaded = await ReadFromJson();
        if (!isMounted || !loaded || Object.keys(loaded).length === 0) {
          return;
        }
        const normalized = normalizeLoadedState(loaded);
        setValues(normalized);
        setDraftValues(normalized);
      } catch (err) {
        console.error("Failed to load output.json", err);
      }
    };

    hydrateFromJson();

    return () => {
      isMounted = false;
    };
  }, []);

  const runAiInsights = async (promptOverride) => {
    const nextPrompt = (promptOverride ?? aiPrompt).trim() || defaultInsightPrompt;
    setIsGeneratingInsights(true);
    setAiError("");
    setAiResponse("");

    try {
      await persistValues(values);
      const response = await GenerateInsights(nextPrompt);
      setAiResponse(formatInsightText(response));
    } catch (err) {
      console.error("Failed to generate AI insights", err);
      setAiError("Unable to generate AI insights right now. Check your GEMINI_API_KEY and try again.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleBudgetTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "ai") {
      runAiInsights();
    }
  };

  const updateDraftField = (tab, field, nextValue) => {
    setDraftValues((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: nextValue
      }
    }));
  };

  const commitField = (tab, field) => {
    setValues((prev) => {
      const next = {
        ...prev,
        [tab]: {
          ...prev[tab],
          [field]: draftValues[tab][field]
        }
      };
      persistValues(next);
      return next;
    });
  };

  const commitIncludeRSU = (checked) => {
    setDraftValues((prev) => ({
      ...prev,
      comp: { ...prev.comp, "Include RSU in Gross Income": checked }
    }));
    setValues((prev) => {
      const next = {
        ...prev,
        comp: { ...prev.comp, "Include RSU in Gross Income": checked }
      };
      persistValues(next);
      return next;
    });
  };

  const commitDynamicItem = (tab, key, index) => {
    setValues((prev) => {
      const updated = [...prev[tab][key]];
      updated[index] = draftValues[tab][key][index];
      const next = {
        ...prev,
        [tab]: { ...prev[tab], [key]: updated }
      };
      persistValues(next);
      return next;
    });
  };

  const removeDynamicItem = (tab, key, index) => {
    const newDraft = draftValues[tab][key].filter((_, i) => i !== index);
    setDraftValues((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: newDraft }
    }));

    setValues((prev) => {
      const newCommitted = prev[tab][key].filter((_, i) => i !== index);
      const next = {
        ...prev,
        [tab]: { ...prev[tab], [key]: newCommitted }
      };
      persistValues(next);
      return next;
    });
  };

  const addDynamicItem = (tab, key, nextItem) => {
    setDraftValues((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: [...prev[tab][key], nextItem] }
    }));

    setValues((prev) => {
      const next = {
        ...prev,
        [tab]: { ...prev[tab], [key]: [...prev[tab][key], nextItem] }
      };
      persistValues(next);
      return next;
    });
  };

  const updateDynamicDraftItem = (tab, key, index, patch) => {
    const updated = [...draftValues[tab][key]];
    updated[index] = { ...updated[index], ...patch };
    setDraftValues((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [key]: updated }
    }));
  };

  const scaleNumericString = (value, ratio) => {
    if (value === "" || value === null || value === undefined) {
      return value;
    }
    const n = Number(value);
    if (Number.isNaN(n)) {
      return value;
    }
    return (n * ratio).toFixed(2).replace(/\.00$/, "");
  };

  const scaleStateByRatio = (state, ratio) => ({
    ...state,
    comp: {
      ...state.comp,
      "Base Pay": scaleNumericString(state.comp["Base Pay"], ratio),
      Bonus: scaleNumericString(state.comp.Bonus, ratio),
      RSU: scaleNumericString(state.comp.RSU, ratio),
      Misc: scaleNumericString(state.comp.Misc, ratio)
    },
    savings: {
      ...state.savings,
      "401k": scaleNumericString(state.savings["401k"], ratio),
      IRA: scaleNumericString(state.savings.IRA, ratio),
      HSA: scaleNumericString(state.savings.HSA, ratio),
      "Back Door": scaleNumericString(state.savings["Back Door"], ratio),
      "Roth 401k": scaleNumericString(state.savings["Roth 401k"], ratio),
      "Roth IRA": scaleNumericString(state.savings["Roth IRA"], ratio),
      "529": scaleNumericString(state.savings["529"], ratio),
      CustomAccounts: state.savings.CustomAccounts.map((acct) => ({
        ...acct,
        amount: scaleNumericString(acct.amount, ratio)
      }))
    },
    expenses: {
      ...state.expenses,
      Housing: scaleNumericString(state.expenses.Housing, ratio),
      Groceries: scaleNumericString(state.expenses.Groceries, ratio),
      Utilities: scaleNumericString(state.expenses.Utilities, ratio),
      Transportation: scaleNumericString(state.expenses.Transportation, ratio),
      Healthcare: scaleNumericString(state.expenses.Healthcare, ratio),
      "Debt Payments": scaleNumericString(state.expenses["Debt Payments"], ratio),
      Insurances: scaleNumericString(state.expenses.Insurances, ratio),
      Subscriptions: state.expenses.Subscriptions.map((sub) => ({
        ...sub,
        amount: scaleNumericString(sub.amount, ratio)
      }))
    },
    wants: {
      ...state.wants,
      Dining: scaleNumericString(state.wants.Dining, ratio),
      Entertainment: scaleNumericString(state.wants.Entertainment, ratio),
      Travel: scaleNumericString(state.wants.Travel, ratio),
      Hobbies: state.wants.Hobbies.map((hobby) => ({
        ...hobby,
        amount: scaleNumericString(hobby.amount, ratio)
      }))
    }
  });

  const handleTogglePeriod = () => {
    const ratio = isMonthly ? 12 : 1 / 12;
    setDraftValues((prev) => scaleStateByRatio(prev, ratio));
    setValues((prev) => {
      const next = scaleStateByRatio(prev, ratio);
      persistValues(next);
      return next;
    });
    setIsMonthly((prev) => !prev);
  };

  const getFederalStandardDeduction = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "married" || s === "married filing jointly" || s === "mfj") {
      return 29200;
    }
    return 14600;
  };

  const grossIncome =
    toNumber(values.comp["Base Pay"]) +
    toNumber(values.comp.Bonus) +
    (values.comp["Include RSU in Gross Income"] ? toNumber(values.comp.RSU) : 0) +
    toNumber(values.comp.Misc);

  const pretaxContrib =
    toNumber(values.savings["401k"]) +
    toNumber(values.savings.HSA) +
    toNumber(values.savings.IRA);

  const afterTaxAdvantaged =
    toNumber(values.savings["Roth 401k"]) +
    toNumber(values.savings["Roth IRA"]) +
    toNumber(values.savings["Back Door"]) +
    toNumber(values.savings["529"]);

  const afterTaxCustom = values.savings.CustomAccounts.reduce(
    (acc, acct) => acc + toNumber(acct?.amount),
    0
  );

  const expensesFixed =
    toNumber(values.expenses.Housing) +
    toNumber(values.expenses.Groceries) +
    toNumber(values.expenses.Utilities) +
    toNumber(values.expenses.Transportation) +
    toNumber(values.expenses.Healthcare) +
    toNumber(values.expenses["Debt Payments"]) +
    toNumber(values.expenses.Insurances);

  const subscriptionsTotal = values.expenses.Subscriptions.reduce(
    (acc, sub) => acc + toNumber(sub?.amount),
    0
  );

  const wantsTotal =
    toNumber(values.wants.Dining) +
    toNumber(values.wants.Entertainment) +
    toNumber(values.wants.Travel);

  const hobbiesTotal = values.wants.Hobbies.reduce(
    (acc, hobby) => acc + toNumber(hobby?.amount),
    0
  );

  const annualGrossIncome = grossIncome * annualMultiplier;
  const annualPretaxContrib = pretaxContrib * annualMultiplier;
  const annualAfterTaxAdvantaged = afterTaxAdvantaged * annualMultiplier;
  const annualAfterTaxCustom = afterTaxCustom * annualMultiplier;
  const annualAdjustedGrossIncome = Math.max(annualGrossIncome - annualPretaxContrib, 0);
  const annualDeductionsSaved = Math.max(annualPretaxContrib, 0);
  const annualInvestmentsTotal =
    annualPretaxContrib + annualAfterTaxAdvantaged + annualAfterTaxCustom;
  const annualTotalOutflow =
    (expensesFixed + subscriptionsTotal + wantsTotal + hobbiesTotal) * annualMultiplier;

  const annualTakeHomePay =
    annualGrossIncome -
    annualPretaxContrib -
    taxDetails.total -
    annualAfterTaxAdvantaged -
    annualAfterTaxCustom -
    annualTotalOutflow;

  const displayGrossIncome = annualGrossIncome / displayDivisor;
  const displayAdjustedGrossIncome = annualAdjustedGrossIncome / displayDivisor;
  const displayDeductionsSaved = annualDeductionsSaved / displayDivisor;
  const displayInvestmentsTotal = annualInvestmentsTotal / displayDivisor;
  const displayPretaxTotal = annualPretaxContrib / displayDivisor;
  const displayAfterTaxAdvantaged = annualAfterTaxAdvantaged / displayDivisor;
  const displayAfterTaxCustom = annualAfterTaxCustom / displayDivisor;
  const displayTakeHomePay = annualTakeHomePay / displayDivisor;
  const displayTaxDetails = {
    federal: taxDetails.federal / displayDivisor,
    state: taxDetails.state / displayDivisor,
    fica: taxDetails.fica / displayDivisor,
    total: taxDetails.total / displayDivisor
  };
  const aiResponseHtml = aiResponse ? renderMarkdownToHtml(aiResponse) : "";

  useEffect(() => {
    const filingStatus = values.comp["Filing Status"] || "single";
    const stateInput = values.comp["Location (State)"] || "";
    const federalTaxable = Math.max(
      annualAdjustedGrossIncome - getFederalStandardDeduction(filingStatus),
      0
    );
    const stateTaxable = Math.max(annualAdjustedGrossIncome, 0);

    const loadTaxes = async () => {
      try {
        const [federal, state, fica] = await Promise.all([
          CalcFederalTax(federalTaxable, filingStatus),
          stateInput ? CalcStateTax(stateTaxable, stateInput, filingStatus) : 0,
          CalcFicaTax(annualGrossIncome)
        ]);
        const total = toNumber(federal) + toNumber(state) + toNumber(fica);
        setTaxDetails({
          federal: toNumber(federal),
          state: toNumber(state),
          fica: toNumber(fica),
          total
        });
      } catch (err) {
        console.error("Tax calculation failed", err);
      }
    };

    loadTaxes();
  }, [values, annualAdjustedGrossIncome, annualGrossIncome]);

  const renderDynamicList = ({
    field,
    tab,
    key,
    itemNamePlaceholder,
    addButtonText
  }) => (
    <div className="settings-field" key={field.label}>
      <label>{field.label}</label>
      {draftValues[tab][key].map((item, index) => (
        <div key={index} className="hobby-row">
          <button
            type="button"
            className="remove-hobby-button"
            onClick={() => removeDynamicItem(tab, key, index)}
          >
            ×
          </button>
          <input
            type="text"
            placeholder={itemNamePlaceholder}
            value={item.name || ""}
            onChange={(e) => updateDynamicDraftItem(tab, key, index, { name: e.target.value })}
            onBlur={() => commitDynamicItem(tab, key, index)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDynamicItem(tab, key, index);
                e.target.blur();
              }
            }}
          />
          <input
            type="number"
            placeholder="Amount"
            value={item.amount || ""}
            onChange={(e) => updateDynamicDraftItem(tab, key, index, { amount: e.target.value })}
            onBlur={() => commitDynamicItem(tab, key, index)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDynamicItem(tab, key, index);
                e.target.blur();
              }
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="add-hobby-button"
        onClick={() => addDynamicItem(tab, key, { name: "", amount: "" })}
      >
        {addButtonText}
      </button>
    </div>
  );

  const renderStandardFields = () =>
    tabFields[activeTab]?.map((field) => {
      if (typeof field === "string") {
        const isFilingStatus = field === "Filing Status";
        return (
          <div className="settings-field" key={field}>
            <label>{field}</label>
            {isFilingStatus ? (
              <select
                value={draftValues[activeTab][field] || ""}
                onChange={(e) => updateDraftField(activeTab, field, e.target.value)}
                onBlur={() => commitField(activeTab, field)}
              >
                <option value="">Select filing status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            ) : (
              <>
                <input
                  type="text"
                  value={draftValues[activeTab][field] || ""}
                  onChange={(e) => updateDraftField(activeTab, field, e.target.value)}
                  onBlur={() => commitField(activeTab, field)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitField(activeTab, field);
                      e.target.blur();
                    }
                  }}
                  placeholder={`Enter ${field}`}
                />
                {field === "RSU" && (
                  <label className="rsu-include-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(values.comp["Include RSU in Gross Income"])}
                      onChange={(e) => commitIncludeRSU(e.target.checked)}
                    />
                    <span className="rsu-toggle-indicator"></span>
                    <span>Include RSU in Gross Income</span>
                  </label>
                )}
              </>
            )}
          </div>
        );
      }

      if (field.dynamic) {
        return renderDynamicList({
          field,
          tab: "wants",
          key: "Hobbies",
          itemNamePlaceholder: "Hobby name",
          addButtonText: "+ Add Hobby"
        });
      }

      if (field.dynamicSavings) {
        return renderDynamicList({
          field,
          tab: "savings",
          key: "CustomAccounts",
          itemNamePlaceholder: "Account name",
          addButtonText: "+ Add Account"
        });
      }

      if (field.dynamicExpenses) {
        return renderDynamicList({
          field,
          tab: "expenses",
          key: "Subscriptions",
          itemNamePlaceholder: "Subscription name",
          addButtonText: "+ Add Subscription"
        });
      }

      return null;
    });

  const renderAiPanel = () => (
    <div className="ai-insights-panel">
      <div className="ai-actions">
        <button
          type="button"
          className="add-hobby-button"
          onClick={() => runAiInsights(aiPrompt)}
          disabled={isGeneratingInsights}
        >
          {isGeneratingInsights ? "Generating..." : "Regenerate Insights"}
        </button>
      </div>
      <div className="ai-output-shell">
        <label className="ai-output-label">AI Insight Output</label>
        {isGeneratingInsights ? (
          <div className="ai-loading-state" role="status" aria-live="polite">
            <div className="ai-loading-orb"></div>
            <div className="ai-loading-lines">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Analyzing your profile and generating insights...</p>
          </div>
        ) : (
          <div className="ai-response-content">
            {aiError ? (
              aiError
            ) : aiResponseHtml ? (
              <div
                className="ai-markdown-content"
                dangerouslySetInnerHTML={{ __html: aiResponseHtml }}
              />
            ) : (
              "Your AI insight summary will appear here."
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div id="App">
      <div className="page-row" role="tablist" aria-label="Primary pages">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            role="tab"
            aria-selected={activePage === page.id}
            aria-controls={`${page.id}-page`}
            className={`page-toggle ${activePage === page.id ? "is-active" : ""}`}
            onClick={() => setActivePage(page.id)}
          >
            {page.label}
          </button>
        ))}
      </div>

      {activePage === "budgeting" && (
        <BudgetingPage
          activeTab={activeTab}
          onTabChange={handleBudgetTabChange}
          tabs={budgetingTabs}
          renderAiPanel={renderAiPanel}
          renderStandardFields={renderStandardFields}
          isMonthly={isMonthly}
          onTogglePeriod={handleTogglePeriod}
          grossIncome={displayGrossIncome}
          adjustedGrossIncome={displayAdjustedGrossIncome}
          deductionsSaved={displayDeductionsSaved}
          investmentsTotal={displayInvestmentsTotal}
          pretaxTotal={displayPretaxTotal}
          afterTaxAdvantaged={displayAfterTaxAdvantaged}
          afterTaxCustom={displayAfterTaxCustom}
          takeHomePay={displayTakeHomePay}
          taxDetails={displayTaxDetails}
        />
      )}

      {activePage === "investments" && <InvestmentsPage />}
    </div>
  );
}

export default App;
