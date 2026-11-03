/*
Copyright 2025 The KubeVela Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Package main is the entry point for the definition registry.
// It outputs all registered definitions as JSON for CLI consumption.
//
// Usage: go run ./cmd/register
//
// The components and traits packages register their definitions in init()
// functions that call defkit.Register(), so importing them is enough.
package main

import (
	"fmt"
	"os"

	"github.com/oam-dev/kubevela/pkg/definition/defkit"

	// Import packages to trigger init() registration
	_ "github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/components"
	_ "github.com/kubecon-na-2026/kubevela-bucket-floci-demo/devkit/traits"
)

func main() {
	output, err := defkit.ToJSON()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to serialize registry: %v\n", err)
		os.Exit(1)
	}
	fmt.Print(string(output))
}
