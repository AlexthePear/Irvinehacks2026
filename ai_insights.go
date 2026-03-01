package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

// generate_insights reads the JSON file, combines it with the prompt, and returns Gemini's response text.
func generate_insights(outputFilePath string, prompt string) (string, error) {
	if err := loadDotEnv(".env"); err != nil {
		return "", err
	}

	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not set")
	}

	fileContents, err := os.ReadFile(outputFilePath)
	if err != nil {
		return "", fmt.Errorf("read %s: %w", outputFilePath, err)
	}

	if strings.TrimSpace(prompt) == "" {
		prompt = `
				You are an Career and Financial advisor to assist the user in saving more money and creating plans for the future. You are taking in a json file as input, parse it out and analyze the inputs based on the following.
				When you respond, respond in markdown. Respond in a bullet point format with titles for different sections, don't use emojis, and talk in a professional manner.
				If one of the input fields doesn't exist, don't explain it at all or mention it. Just skip over it if it doesn't exist.
				Analyze the total spread of income, deductions, and spending and tell the user how they are doing based on best general financial practices.
				Analyze the job title, company, and years of experience field. If the fields are filled in, report on how the reported salary compares to the average employee in their field, at their specific company, and around their years of experience depending on what was given.
				Analyze the deductions that were filled out, if the user is not fully making use of their deductions offer advice for how to re-organize their spending to make more use out of the deductions.
				Analyze the amount given to investments/savings, offer advice for how much money the user putting in to savings and in what fields.
				Analyze the expenses and wants, point out areas where we can lower the amount of spending and total how much money they could be saving given they made your changes.
				`
	}

	requestBody := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{
						"text": fmt.Sprintf("%s\n\nJSON input:\n%s", prompt, string(fileContents)),
					},
				},
			},
		},
	}

	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("marshal Gemini request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, geminiEndpoint+"?key="+apiKey, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("create Gemini request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("send Gemini request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read Gemini response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Gemini API returned %s: %s", resp.Status, strings.TrimSpace(string(respBody)))
	}

	var parsed geminiResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("decode Gemini response: %w", err)
	}

	for _, candidate := range parsed.Candidates {
		for _, part := range candidate.Content.Parts {
			if strings.TrimSpace(part.Text) != "" {
				return part.Text, nil
			}
		}
	}

	return "", fmt.Errorf("Gemini response did not contain any text")
}

func loadDotEnv(path string) error {
	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) != "" {
		return nil
	}

	contents, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read %s: %w", path, err)
	}

	lines := strings.Split(string(contents), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)

		if key != "" {
			_ = os.Setenv(key, value)
		}
	}

	return nil
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}
