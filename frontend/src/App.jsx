import { useEffect, useState } from "react";
import LiveDisplay from "./components/LiveDisplay/LiveDisplay";
import {
  WriteToJson,
  CalcFederalTax,
  CalcStateTax,
  CalcFicaTax
} from "../wailsjs/go/main/App";
import "./App.css";

const tabs = [
  { id: "comp", label: "Compensation" },
  { id: "savings", label: "Savings" },
  { id: "expenses", label: "Expenses" },
  { id: "wants", label: "Wants" }
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
    { label: "Subscriptions", dynamicExpenses: true }]
};

const initialState = {
  comp: {
    "Base Pay": "",
    "Bonus": "",
    "RSU": "",
    "Include RSU in Gross Income": false,
    "Location (State)": "",
    "Filing Status": "",
    "Misc": ""
  },
  savings: {
    "401k": "",
    "IRA": "",
    "HSA": "",
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
  }
};

function App() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [values, setValues] = useState(initialState);
  const [draftValues, setDraftValues] = useState(initialState);
  const [isMonthly, setIsMonthly] = useState(false);
  const [taxDetails, setTaxDetails] = useState({
    federal: 0,
    state: 0,
    fica: 0,
    total: 0
  });

  const persistValues = async (payload) => {
    try {
      await WriteToJson(payload);
    } catch (err) {
      console.error("Failed to write JSON", err);
    }
  };

  /* ===============================
     Commit Functions
  =============================== */

  const commitField = (tab, field) => {
    setValues((prev) => {
      const updated = {
        ...prev,
        [tab]: {
          ...prev[tab],
          [field]: draftValues[tab][field]
        }
      };
      persistValues(updated);
      return updated;
    });
  };

  const commitHobby = (index) => {
    setValues((prev) => {
      const updated = [...prev.wants.Hobbies];
      updated[index] = draftValues.wants.Hobbies[index];
      const next = {
        ...prev,
        wants: { ...prev.wants, Hobbies: updated }
      };
      persistValues(next);
      return next;
    });
  };

  const commitCustomAccount = (index) => {
    setValues((prev) => {
      const updated = [...prev.savings.CustomAccounts];
      updated[index] = draftValues.savings.CustomAccounts[index];
      const next = {
        ...prev,
        savings: { ...prev.savings, CustomAccounts: updated }
      };
      persistValues(next);
      return next;
    });
  };

  const commitSubscription = (index) => {
    setValues((prev) => {
      const updated = [...prev.expenses.Subscriptions];
      updated[index] = draftValues.expenses.Subscriptions[index];
      const next = {
        ...prev,
        expenses: { ...prev.expenses, Subscriptions: updated }
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

  const toNumber = (val) => Number(val || 0);
  const annualMultiplier = isMonthly ? 12 : 1;
  const displayDivisor = isMonthly ? 12 : 1;

  const scaleNumericString = (value, ratio) => {
    const n = Number(value);
    if (Number.isNaN(n)) {
      return value;
    }
    return (n * ratio).toFixed(2).replace(/\.00$/, "");
  };

  const scaleStateByRatio = (state, ratio) => {
    const scaled = {
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
      expenses: Object.fromEntries(
        Object.entries(state.expenses).map(([key, val]) => {
          if (key === "Subscriptions" && Array.isArray(val)) {
            return [
              key,
              val.map((sub) => ({
                ...sub,
                amount: scaleNumericString(sub.amount, ratio)
              }))
            ];
          }
          return [key, scaleNumericString(val, ratio)];
        })
      ),
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
    };
    return scaled;
  };

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
      return 29200; // 2024 approx
    }
    return 14600; // default single/other
  };

  /* ===============================
     Calculations (Committed Only)
  =============================== */

  const grossIncome =
    toNumber(values.comp["Base Pay"]) +
    toNumber(values.comp["Bonus"]) +
    (values.comp["Include RSU in Gross Income"] ? toNumber(values.comp["RSU"]) : 0) +
    toNumber(values.comp["Misc"]);

  const pretaxContrib =
    toNumber(values.savings["401k"]) +
    toNumber(values.savings["HSA"]) +
    toNumber(values.savings["IRA"]);

  const afterTaxAdvantaged =
    toNumber(values.savings["Roth 401k"]) +
    toNumber(values.savings["Roth IRA"]) +
    toNumber(values.savings["Back Door"]) +
    toNumber(values.savings["529"]);

  const afterTaxCustom = values.savings.CustomAccounts.reduce(
    (acc, acct) => acc + toNumber(acct?.amount),
    0
  );

  const annualGrossIncome = grossIncome * annualMultiplier;
  const annualPretaxContrib = pretaxContrib * annualMultiplier;
  const annualAfterTaxAdvantaged = afterTaxAdvantaged * annualMultiplier;
  const annualAfterTaxCustom = afterTaxCustom * annualMultiplier;

  const annualAdjustedGrossIncome = Math.max(annualGrossIncome - annualPretaxContrib, 0);
  const annualDeductionsSaved = Math.max(annualPretaxContrib, 0);

  const expenseTotal = Object.values(values.expenses).reduce(
    (acc, val) => {
      if (Array.isArray(val)) {
        return acc + val.reduce((sum, item) => sum + toNumber(item?.amount), 0);
      }
      return acc + toNumber(val);
    },
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

  const annualInvestmentsTotal =
    annualPretaxContrib + annualAfterTaxAdvantaged + annualAfterTaxCustom;

  const annualTotalOutflow = (expenseTotal + wantsTotal + hobbiesTotal) * annualMultiplier;

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

  /* ===============================
     Tax calculations via Go helpers
  =============================== */

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
        setTaxDetails((prev) => ({ ...prev, total: prev.federal + prev.state + prev.fica }));
      }
    };

    loadTaxes();
  }, [values, annualAdjustedGrossIncome, annualGrossIncome]);

  return (
    <div id="App">
      <LiveDisplay
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

      <div className="panel-shell">
        <div className="tab-row">
          {tabs.map((tab) => (
            <label className="tab-toggle" key={tab.id}>
              <input
                type="radio"
                name="tabs"
                checked={activeTab === tab.id}
                onChange={() => setActiveTab(tab.id)}
              />
              <span>{tab.label}</span>
            </label>
          ))}
        </div>

        <div className="settings-window">
          {tabFields[activeTab].map((field) => {
            if (typeof field === "string") {
              const isFilingStatus = field === "Filing Status";
              return (
                <div className="settings-field" key={field}>
                  <label>{field}</label>
                  {isFilingStatus ? (
                    <select
                      value={draftValues[activeTab][field] || ""}
                      onChange={(e) =>
                        setDraftValues({
                          ...draftValues,
                          [activeTab]: {
                            ...draftValues[activeTab],
                            [field]: e.target.value
                          }
                        })
                      }
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
                        onChange={(e) =>
                          setDraftValues({
                            ...draftValues,
                            [activeTab]: {
                              ...draftValues[activeTab],
                              [field]: e.target.value
                            }
                          })
                        }
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
              return (
                <div className="settings-field" key={field.label}>
                  <label>{field.label}</label>

                  {draftValues.wants.Hobbies.map((hobby, index) => (
                    <div key={index} className="hobby-row">
                      <button
                        type="button"
                        className="remove-hobby-button"
                        onClick={() => {
                          const newDraft = draftValues.wants.Hobbies.filter(
                            (_, i) => i !== index
                          );
                          const newCommitted = values.wants.Hobbies.filter(
                            (_, i) => i !== index
                          );

                          setDraftValues({
                            ...draftValues,
                            wants: { ...draftValues.wants, Hobbies: newDraft }
                          });

                          setValues((prev) => {
                            const next = {
                              ...prev,
                              wants: { ...prev.wants, Hobbies: newCommitted }
                            };
                            persistValues(next);
                            return next;
                          });
                        }}
                      >
                        ×
                      </button>

                      <input
                        type="text"
                        placeholder="Hobby name"
                        value={hobby.name || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.wants.Hobbies];
                          updated[index] = {
                            ...updated[index],
                            name: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            wants: { ...draftValues.wants, Hobbies: updated }
                          });
                        }}
                        onBlur={() => commitHobby(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitHobby(index);
                            e.target.blur();
                          }
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Amount"
                        value={hobby.amount || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.wants.Hobbies];
                          updated[index] = {
                            ...updated[index],
                            amount: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            wants: { ...draftValues.wants, Hobbies: updated }
                          });
                        }}
                        onBlur={() => commitHobby(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitHobby(index);
                            e.target.blur();
                          }
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-hobby-button"
                    onClick={() => {
                      const newHobby = { name: "", amount: "" };

                      setDraftValues({
                        ...draftValues,
                        wants: {
                          ...draftValues.wants,
                          Hobbies: [...draftValues.wants.Hobbies, newHobby]
                        }
                      });

                      setValues({
                        ...values,
                        wants: {
                          ...values.wants,
                          Hobbies: [...values.wants.Hobbies, newHobby]
                        }
                      });
                    }}
                  >
                    + Add Hobby
                  </button>
                </div>
              );
            }

            if (field.dynamicSavings) {
              return (
                <div className="settings-field" key={field.label}>
                  <label>{field.label}</label>

                  {draftValues.savings.CustomAccounts.map((acct, index) => (
                    <div key={index} className="hobby-row">
                      <button
                        type="button"
                        className="remove-hobby-button"
                        onClick={() => {
                          const newDraft = draftValues.savings.CustomAccounts.filter(
                            (_, i) => i !== index
                          );
                          const newCommitted = values.savings.CustomAccounts.filter(
                            (_, i) => i !== index
                          );

                          setDraftValues({
                            ...draftValues,
                            savings: { ...draftValues.savings, CustomAccounts: newDraft }
                          });

                          setValues((prev) => {
                            const next = {
                              ...prev,
                              savings: { ...prev.savings, CustomAccounts: newCommitted }
                            };
                            persistValues(next);
                            return next;
                          });
                        }}
                      >
                        ×
                      </button>

                      <input
                        type="text"
                        placeholder="Account name"
                        value={acct.name || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.savings.CustomAccounts];
                          updated[index] = {
                            ...updated[index],
                            name: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            savings: { ...draftValues.savings, CustomAccounts: updated }
                          });
                        }}
                        onBlur={() => commitCustomAccount(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitCustomAccount(index);
                            e.target.blur();
                          }
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Amount"
                        value={acct.amount || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.savings.CustomAccounts];
                          updated[index] = {
                            ...updated[index],
                            amount: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            savings: { ...draftValues.savings, CustomAccounts: updated }
                          });
                        }}
                        onBlur={() => commitCustomAccount(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitCustomAccount(index);
                            e.target.blur();
                          }
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-hobby-button"
                    onClick={() => {
                      const newAccount = { name: "", amount: "" };

                      setDraftValues({
                        ...draftValues,
                        savings: {
                          ...draftValues.savings,
                          CustomAccounts: [...draftValues.savings.CustomAccounts, newAccount]
                        }
                      });

                      setValues((prev) => {
                        const next = {
                          ...prev,
                          savings: {
                            ...prev.savings,
                            CustomAccounts: [...prev.savings.CustomAccounts, newAccount]
                          }
                        };
                        persistValues(next);
                        return next;
                      });
                    }}
                  >
                    + Add Account
                  </button>
                </div>
              );
            }

            if (field.dynamicExpenses) {
              return (
                <div className="settings-field" key={field.label}>
                  <label>{field.label}</label>

                  {draftValues.expenses.Subscriptions.map((sub, index) => (
                    <div key={index} className="hobby-row">
                      <button
                        type="button"
                        className="remove-hobby-button"
                        onClick={() => {
                          const newDraft = draftValues.expenses.Subscriptions.filter(
                            (_, i) => i !== index
                          );
                          const newCommitted = values.expenses.Subscriptions.filter(
                            (_, i) => i !== index
                          );

                          setDraftValues({
                            ...draftValues,
                            expenses: { ...draftValues.expenses, Subscriptions: newDraft }
                          });

                          setValues((prev) => {
                            const next = {
                              ...prev,
                              expenses: { ...prev.expenses, Subscriptions: newCommitted }
                            };
                            persistValues(next);
                            return next;
                          });
                        }}
                      >
                        ×
                      </button>

                      <input
                        type="text"
                        placeholder="Subscription name"
                        value={sub.name || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.expenses.Subscriptions];
                          updated[index] = {
                            ...updated[index],
                            name: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            expenses: { ...draftValues.expenses, Subscriptions: updated }
                          });
                        }}
                        onBlur={() => commitSubscription(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitSubscription(index);
                            e.target.blur();
                          }
                        }}
                      />

                      <input
                        type="number"
                        placeholder="Amount"
                        value={sub.amount || ""}
                        onChange={(e) => {
                          const updated = [...draftValues.expenses.Subscriptions];
                          updated[index] = {
                            ...updated[index],
                            amount: e.target.value
                          };
                          setDraftValues({
                            ...draftValues,
                            expenses: { ...draftValues.expenses, Subscriptions: updated }
                          });
                        }}
                        onBlur={() => commitSubscription(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitSubscription(index);
                            e.target.blur();
                          }
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-hobby-button"
                    onClick={() => {
                      const newSubscription = { name: "", amount: "" };

                      setDraftValues({
                        ...draftValues,
                        expenses: {
                          ...draftValues.expenses,
                          Subscriptions: [...draftValues.expenses.Subscriptions, newSubscription]
                        }
                      });

                      setValues((prev) => {
                        const next = {
                          ...prev,
                          expenses: {
                            ...prev.expenses,
                            Subscriptions: [...prev.expenses.Subscriptions, newSubscription]
                          }
                        };
                        persistValues(next);
                        return next;
                      });
                    }}
                  >
                    + Add Subscription
                  </button>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
