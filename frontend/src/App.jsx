import { useState } from "react";
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
  wants: ["Dining", "Entertainment", "Hobbies", "Travel"]
};

function App() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const [values, setValues] = useState({
    comp: { Salary: "", Bonus: "" },
    savings: { "401k": "", "Emergency Fund": "" },
    expenses: { Rent: "", Food: "", Utilities: "" },
    wants: { Vacation: "", Gadgets: "" }
  });

  return (
    <div id="App">
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
          {tabFields[activeTab].map((field) => (
            <div className="settings-field" key={field}>
              <label htmlFor={`${activeTab}-${field}`}>{field}</label>
              <input
                id={`${activeTab}-${field}`}
                type="text"
                value={values[activeTab][field]}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [activeTab]: {
                      ...values[activeTab],
                      [field]: e.target.value
                    }
                  })
                }
                placeholder={`Enter ${field}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;