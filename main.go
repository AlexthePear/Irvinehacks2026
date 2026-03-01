package main

import (
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// res_ai, error_ai := generate_insights("output.json", "")

	// if error_ai != nil{
	// 	println("error: ", error_ai)
	// 	return
	// }
	// println(res_ai)
	

	res, error := StateTaxOwed(30000, "california", "single")
	res_fed, _ := FederalTaxOwed(30000, "single")
	if error != nil {
		fmt.Println("error caught", error)
		return
	}

	fmt.Println(res)
	fmt.Println(res_fed)

	// Create an instance of the app structure
	app := NewApp()

	fmt.Println("About to start Wails...")
	errRun := wails.Run(&options.App{ /* ... */ })
	fmt.Println("Wails.Run returned")
	if errRun != nil {
		fmt.Println("Error:", errRun)
	}

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "financialPlanner",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
