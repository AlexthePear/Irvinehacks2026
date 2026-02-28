import { useState } from 'react';
import './App.css';

const tabs = [
    { id: 'comp', label: 'Compensation' }
];

function App() {
    const [activeTab, setActiveTab] = useState(tabs[0].id);

    return (
        <div id="App">
            <div className="panel-shell">
                <div className="tab-row">
                    {tabs.map((tab) => (
                        <label className="tab-toggle" key={tab.id}>
                            <input
                                type="checkbox"
                                checked={activeTab === tab.id}
                                onChange={() => setActiveTab(tab.id)}
                            />
                            <span>{tab.label}</span>
                        </label>
                    ))}
                </div>

                <div className="settings-window">
                    <div className="settings-field">
                        <label htmlFor={`${activeTab}-setting`}>{activeTab}</label>
                        <input
                            id={`${activeTab}-setting`}
                            type="text"
                            placeholder="Enter value"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
