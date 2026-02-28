import { useState } from "react";
import LiveDisplay from "./components/LiveDisplay/LiveDisplay";
import "./App.css";

const tabs = [
  { id: "comp", label: "Compensation" },
  { id: "savings", label: "Savings" },
  { id: "expenses", label: "Expenses" },
  { id: "wants", label: "Wants" }
];

const tabFields = {
  comp: ["Base Pay", "Bonus", "RSU", "Location (Zip Code)", "Filing Status", "Misc"],
  savings: ["401k", "IRA", "HSA", "Back Door", "Brokerage", "529"],
  expenses: ["Housing", "Groceries", "Utilities", "Transportation", "Healthcare", "Debt Payments", "Insurances"],
  wants: ["Dining", "Entertainment", "Travel", { label: "Hobbies", dynamic: true }]
};

const initialState = {
  comp: {
    "Base Pay": "",
    "Bonus": "",
    "RSU": "",
    "Location (Zip Code)": "",
    "Filing Status": "",
    "Misc": ""
  },
  savings: {
    "401k": "",
    "IRA": "",
    "HSA": "",
    "Back Door": "",
    "Brokerage": "",
    "529": ""
  },
  expenses: {
    Housing: "",
    Groceries: "",
    Utilities: "",
    Transportation: "",
    Healthcare: "",
    "Debt Payments": "",
    Insurances: ""
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

  /* ===============================
     Commit Functions
  =============================== */

  const commitField = (tab, field) => {
    setValues((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: draftValues[tab][field]
      }
    }));
  };

  const commitHobby = (index) => {
    setValues((prev) => {
      const updated = [...prev.wants.Hobbies];
      updated[index] = draftValues.wants.Hobbies[index];
      return {
        ...prev,
        wants: { ...prev.wants, Hobbies: updated }
      };
    });
  };

  /* ===============================
     Calculations (Committed Only)
  =============================== */

  const totalIncome =
    Number(values.comp["Base Pay"] || 0) +
    Number(values.comp["Bonus"] || 0) +
    Number(values.comp["RSU"] || 0);

  const expenseTotal = Object.values(values.expenses).reduce(
    (acc, val) => acc + Number(val || 0),
    0
  );

  const wantsTotal =
    Number(values.wants.Dining || 0) +
    Number(values.wants.Entertainment || 0) +
    Number(values.wants.Travel || 0);

  const hobbiesTotal = values.wants.Hobbies.reduce(
    (acc, hobby) => acc + Number(hobby?.amount || 0),
    0
  );

  const totalOutflow = expenseTotal + wantsTotal + hobbiesTotal;
  const remainingIncome = totalIncome - totalOutflow;

  return (
    <div id="App">
      <LiveDisplay
        totalIncome={totalIncome}
        remainingIncome={remainingIncome}
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
              return (
                <div className="settings-field" key={field}>
                  <label>{field}</label>
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

                          setValues({
                            ...values,
                            wants: { ...values.wants, Hobbies: newCommitted }
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

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export default App;