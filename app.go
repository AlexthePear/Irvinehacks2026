package main

import (
	"context"
	"fmt"
	"encoding/json"
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
