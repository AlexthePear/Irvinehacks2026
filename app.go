package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	data := struct {
		Name string `json:"name"`
	}{
		Name: name,
	}

	// Create file (overwrites if exists)
	file, _ := os.Create("output.json")
	defer file.Close()

	// Encode struct to JSON and write to file
	encoder := json.NewEncoder(file)
	encoder.Encode(data)

	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// WriteToJson writes the provided committed user values to output.json.
func (a *App) WriteToJson(values map[string]map[string]interface{}) error {
	file, err := os.Create("output.json")
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")

	return encoder.Encode(values)
}

// ReadFromJson loads saved planner values from output.json.
// If the file does not exist, it returns an empty object.
func (a *App) ReadFromJson() (map[string]interface{}, error) {
	file, err := os.Open("output.json")
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]interface{}{}, nil
		}
		return nil, err
	}
	defer file.Close()

	var data map[string]interface{}
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		return nil, err
	}

	if data == nil {
		return map[string]interface{}{}, nil
	}

	return data, nil
}

// CalcFederalTax exposes the federal tax calculation to the frontend.
func (a *App) CalcFederalTax(taxableIncome float64, filingStatus string) (float64, error) {
	return FederalTaxOwed(taxableIncome, filingStatus)
}

// CalcStateTax exposes the state tax calculation to the frontend.
func (a *App) CalcStateTax(taxableIncome float64, state string, filingStatus string) (float64, error) {
	return StateTaxOwed(taxableIncome, state, filingStatus)
}

// CalcFicaTax calculates FICA taxes (Social Security + Medicare) with current caps.
func (a *App) CalcFicaTax(income float64) float64 {
	if income <= 0 {
		return 0
	}

	const ssRate = 0.062
	const ssWageBase = 168600.0 // approximate 2024 cap; adjust as needed
	const medicareRate = 0.0145
	const addlMedicareRate = 0.009
	const addlThreshold = 200000.0

	ssTaxable := income
	if ssTaxable > ssWageBase {
		ssTaxable = ssWageBase
	}

	socialSecurity := ssTaxable * ssRate
	medicare := income * medicareRate

	if income > addlThreshold {
		medicare += (income - addlThreshold) * addlMedicareRate
	}

	return socialSecurity + medicare
}

// GenerateInsights reads output.json, sends it to Gemini with the provided prompt, and returns the model response.
func (a *App) GenerateInsights(prompt string) (string, error) {
	return generate_insights("output.json", prompt)
}
