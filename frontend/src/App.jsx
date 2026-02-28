import { useState } from "react";
import LiveDisplay from './components/LiveDisplay/LiveDisplay'
import "./App.css";

const tabs = [
  { id: "comp", label: "Compensation" },
  { id: "savings", label: "Savings" },
  { id: "expenses", label: "Expenses" },
  { id: "wants", label: "Wants" }
];

// Updated tabFields with dynamic Hobbies
const tabFields = {
  comp: ["Base Pay", "Bonus", "RSU", "Location (Zip Code)", "Filing Status", "Misc"],
  savings: ["401k", "IRA", "HSA", "Back Door", "Brokerage", "529"],
  expenses: ["Housing", "Groceries", "Utilities", "Transportation", "Healthcare", "Debt Payments", "Insurances"],
  wants: ["Dining", "Entertainment", "Travel", { label: "Hobbies", dynamic: true }]
};

function App() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const [values, setValues] = useState({
    comp: {
      "Base Pay": "",
      "Bonus": "",
      "RSU": "",
      "Location (Zip Code)": "",
      "Filing Status": "",
      "Misc": ""
    },
    savings: { "401k": "", "IRA": "", "HSA": "", "Back Door": "", "Brokerage": "", "529": "" },
    expenses: { Housing: "", Groceries: "", Utilities: "", Transportation: "", Healthcare: "", "Debt Payments": "", Insurances: "" },
    wants: { Dining: "", Entertainment: "", Hobbies: [], Travel: "" }
  });

  // Calculate total salary
  const totalSalary = Number(values.comp["Base Pay"] || 0) +
                      Number(values.comp["Bonus"] || 0) +
                      Number(values.comp["RSU"] || 0);

  // Calculate total expenses including hobbies
  const totalExpenses = Object.values(values.expenses).reduce(
    (acc, val) => acc + Number(val || 0),
    0
  ) + values.wants.Hobbies.reduce(
    (acc, hobby) => acc + Number(hobby.amount || 0),
    0
  );

  return (
    <div id="App">
      <LiveDisplay salary={totalSalary} expenses={totalExpenses} />

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
              // Normal static input
              return (
                <div className="settings-field" key={field}>
                  <label htmlFor={`${activeTab}-${field}`}>{field}</label>
                  <input
                    id={`${activeTab}-${field}`}
                    type="text"
                    value={values[activeTab][field] || ""}
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
              );
            } else if (field.dynamic) {
              // Dynamic Hobbies field
              return (
                <div className="settings-field" key={field.label}>
                  <label>{field.label}</label>

                  {values.wants.Hobbies.map((hobby, index) => (
                    <div key={index} className="hobby-row">
                      <button
                        type="button"
                        className="remove-hobby-button"
                        onClick={() => {
                          const newHobbies = values.wants.Hobbies.filter((_, i) => i !== index);
                          setValues({
                            ...values,
                            wants: { ...values.wants, Hobbies: newHobbies }
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
                          const newHobbies = [...values.wants.Hobbies];
                          newHobbies[index].name = e.target.value;
                          setValues({
                            ...values,
                            wants: { ...values.wants, Hobbies: newHobbies }
                          });
                        }}
                      />
                      
                      <input
                        type="number"
                        placeholder="Amount"
                        value={hobby.amount || 0}
                        onChange={(e) => {
                          const newHobbies = [...values.wants.Hobbies];
                          newHobbies[index].amount = Number(e.target.value);
                          setValues({
                            ...values,
                            wants: { ...values.wants, Hobbies: newHobbies }
                          });
                        }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    className="add-hobby-button"
                    onClick={() =>
                      setValues({
                        ...values,
                        wants: {
                          ...values.wants,
                          Hobbies: [...values.wants.Hobbies, { name: "", amount: 0 }]
                        }
                      })
                    }
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