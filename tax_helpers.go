package main

import (
	"encoding/csv"
	"errors"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// taxBracket represents a progressive rate that applies from a lower bound up to the next bracket.
type taxBracket struct {
	lower float64
	rate  float64
}

// federalTaxTables holds bracket slices keyed by filing status.
var federalTaxTables map[string][]taxBracket

// stateTaxTables holds per-state bracket slices and deductions for single/married filers.
type stateTaxTable struct {
	singleBrackets   []taxBracket
	marriedBrackets  []taxBracket
	singleDeduction  float64
	marriedDeduction float64
}

var stateTaxTables map[string]stateTaxTable

var (
	loadFederalOnce sync.Once
	loadStateOnce   sync.Once
	loadErr         error
)

// CalculateFederalTax computes federal tax owed for a taxable income and filing status using federal_tax_brackets.csv.
func CalculateFederalTax(taxableIncome float64, filingStatus string) (float64, error) {
	loadFederalOnce.Do(func() {
		federalTaxTables, loadErr = loadFederalBrackets("federal_tax_brackets.csv")
	})
	if loadErr != nil {
		return 0, loadErr
	}

	statusKey := normalizeStatus(filingStatus)
	brackets, ok := federalTaxTables[statusKey]
	if !ok {
		return 0, fmt.Errorf("unsupported filing status: %s", filingStatus)
	}

	tax := computeProgressiveTax(taxableIncome, brackets)
	return tax, nil
}

// CalculateStateTax computes state tax owed for a taxable income, state, and filing status using state_tax_brackets.csv.
// It applies the state-level standard deduction (from the CSV) before computing the bracketed tax.
func CalculateStateTax(taxableIncome float64, state string, filingStatus string) (float64, error) {
	loadStateOnce.Do(func() {
		stateTaxTables, loadErr = loadStateBrackets("state_tax_brackets.csv")
	})
	if loadErr != nil {
		return 0, loadErr
	}

	table, ok := stateTaxTables[strings.ToLower(strings.TrimSpace(state))]
	if !ok {
		return 0, fmt.Errorf("state not found: %s", state)
	}

	statusKey := normalizeStatus(filingStatus)
	var brackets []taxBracket
	var deduction float64

	switch statusKey {
	case "single", "head_of_household":
		brackets = table.singleBrackets
		deduction = table.singleDeduction
	case "married":
		brackets = table.marriedBrackets
		deduction = table.marriedDeduction
	default:
		return 0, fmt.Errorf("unsupported filing status: %s", filingStatus)
	}

	adjustedIncome := taxableIncome - deduction
	if adjustedIncome < 0 {
		adjustedIncome = 0
	}

	tax := computeProgressiveTax(adjustedIncome, brackets)
	return tax, nil
}

// loadFederalBrackets parses the federal_tax_brackets.csv file into bracket tables keyed by filing status.
func loadFederalBrackets(path string) (map[string][]taxBracket, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	if len(records) < 2 {
		return nil, errors.New("federal tax file missing data")
	}

	tables := map[string][]taxBracket{
		"single":            {},
		"married":           {},
		"head_of_household": {},
	}

	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 4 {
			continue
		}

		rate, err := parseFloat(row[0])
		if err != nil {
			return nil, fmt.Errorf("invalid rate on line %d: %w", i+1, err)
		}

		singleLower, err := parseFloat(row[1])
		if err != nil {
			return nil, fmt.Errorf("invalid single lowerbound on line %d: %w", i+1, err)
		}

		marriedLower, err := parseFloat(row[2])
		if err != nil {
			return nil, fmt.Errorf("invalid married lowerbound on line %d: %w", i+1, err)
		}

		hohLower, err := parseFloat(row[3])
		if err != nil {
			return nil, fmt.Errorf("invalid household lowerbound on line %d: %w", i+1, err)
		}

		tables["single"] = append(tables["single"], taxBracket{lower: singleLower, rate: rate})
		tables["married"] = append(tables["married"], taxBracket{lower: marriedLower, rate: rate})
		tables["head_of_household"] = append(tables["head_of_household"], taxBracket{lower: hohLower, rate: rate})
	}

	for status, brackets := range tables {
		sort.Slice(brackets, func(i, j int) bool { return brackets[i].lower < brackets[j].lower })
		tables[status] = brackets
	}

	return tables, nil
}

// loadStateBrackets parses the state_tax_brackets.csv file into per-state tables.
func loadStateBrackets(path string) (map[string]stateTaxTable, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	if len(records) < 2 {
		return nil, errors.New("state tax file missing data")
	}

	tables := make(map[string]stateTaxTable)

	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 7 {
			continue
		}

		state := strings.ToLower(strings.TrimSpace(row[0]))

		singleRate, err := parseFloat(row[1])
		if err != nil {
			return nil, fmt.Errorf("invalid single rate on line %d: %w", i+1, err)
		}
		singleLower, err := parseFloat(row[2])
		if err != nil {
			return nil, fmt.Errorf("invalid single lowerbound on line %d: %w", i+1, err)
		}

		marriedRate, err := parseFloat(row[3])
		if err != nil {
			return nil, fmt.Errorf("invalid married rate on line %d: %w", i+1, err)
		}
		marriedLower, err := parseFloat(row[4])
		if err != nil {
			return nil, fmt.Errorf("invalid married lowerbound on line %d: %w", i+1, err)
		}

		singleDeduction, err := parseFloat(row[5])
		if err != nil {
			return nil, fmt.Errorf("invalid single deduction on line %d: %w", i+1, err)
		}
		marriedDeduction, err := parseFloat(row[6])
		if err != nil {
			return nil, fmt.Errorf("invalid married deduction on line %d: %w", i+1, err)
		}

		table := tables[state]
		table.singleBrackets = append(table.singleBrackets, taxBracket{lower: singleLower, rate: singleRate})
		table.marriedBrackets = append(table.marriedBrackets, taxBracket{lower: marriedLower, rate: marriedRate})

		// If deductions repeat across rows, keep the first non-zero value; otherwise update to the current row's deduction.
		if table.singleDeduction == 0 || singleDeduction != 0 {
			table.singleDeduction = singleDeduction
		}
		if table.marriedDeduction == 0 || marriedDeduction != 0 {
			table.marriedDeduction = marriedDeduction
		}

		tables[state] = table
	}

	for state, table := range tables {
		sort.Slice(table.singleBrackets, func(i, j int) bool { return table.singleBrackets[i].lower < table.singleBrackets[j].lower })
		sort.Slice(table.marriedBrackets, func(i, j int) bool { return table.marriedBrackets[i].lower < table.marriedBrackets[j].lower })
		tables[state] = table
	}

	return tables, nil
}

// computeProgressiveTax applies progressive brackets to the given income.
func computeProgressiveTax(income float64, brackets []taxBracket) float64 {
	if income <= 0 {
		return 0
	}

	tax := 0.0

	for i, bracket := range brackets {
		upper := math.Inf(1)
		if i+1 < len(brackets) {
			upper = brackets[i+1].lower
		}

		if income <= bracket.lower {
			break
		}

		taxablePortion := income - bracket.lower
		if taxablePortion > (upper - bracket.lower) {
			taxablePortion = upper - bracket.lower
		}

		tax += taxablePortion * (bracket.rate / 100.0)
	}

	return tax
}

func parseFloat(value string) (float64, error) {
	return strconv.ParseFloat(strings.TrimSpace(value), 64)
}

// normalizeStatus maps common status strings to internal keys.
func normalizeStatus(status string) string {
	s := strings.ToLower(strings.TrimSpace(status))
	switch s {
	case "single", "s":
		return "single"
	case "married", "mfj", "married filing jointly":
		return "married"
	case "hoh", "head of household", "head_of_household":
		return "head_of_household"
	default:
		return s
	}
}
