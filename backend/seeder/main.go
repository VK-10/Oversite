package main

import (
	"fmt"
)

func main() {

	fmt.Println("🚀 Seeder started")

	if err := scripting(); err != nil {
		fmt.Println("❌ Script failed:", err)
	} else {
		fmt.Println("✅ Seeder completed")
	}
}
