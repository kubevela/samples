// Package cuetest evaluates CUE definitions, the ones defkit generates and
// the hand-written ones in ../../../definitions, the same way: property
// validation and rendering components and traits.
package cuetest

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"cuelang.org/go/cue"
	"cuelang.org/go/cue/cuecontext"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

// Definition is anything defkit can turn into a CUE definition.
type Definition interface {
	ToCue() string
}

// File is a hand-written CUE definition.
type File string

// ToCue returns the definition's source.
func (f File) ToCue() string { return string(f) }

// ReadDefinition reads a hand-written CUE definition, path being relative to
// the demo's definitions/ directory. Tests run in their package's directory,
// so it works from any package directly under devkit/.
func ReadDefinition(t *testing.T, path string) File {
	t.Helper()
	src, err := os.ReadFile("../../definitions/" + path)
	if err != nil {
		t.Fatal(err)
	}
	return File(src)
}

// Get returns the field at a dot-separated path in a rendered object, or
// nil when obj is not an object or the path is missing.
func Get(obj any, path string) any {
	m, ok := obj.(map[string]any)
	if !ok {
		return nil
	}
	v, _, _ := unstructured.NestedFieldNoCopy(m, strings.Split(path, ".")...)
	return v
}

var (
	contextPath   = cue.ParsePath("context")
	parameterPath = cue.ParsePath("template.parameter")
	patchPath     = cue.ParsePath("template.patch")
	outputPath    = cue.ParsePath("template.output")
	outputsPath   = cue.ParsePath("template.outputs")
)

// ValidateProperties unifies props with the definition's parameter schema,
// the same check KubeVela makes when it renders an Application, and reports
// missing required fields, wrong types and out-of-range values. props is a
// Go value, or raw JSON as it appears in an Application (so JSON integers
// stay integers).
func ValidateProperties(def Definition, props any) error {
	root, err := compile(def)
	if err != nil {
		return err
	}
	var value cue.Value
	if raw, ok := props.([]byte); ok {
		value = root.Context().CompileBytes(raw)
	} else {
		value = root.Context().Encode(props)
	}
	if err := value.Err(); err != nil {
		return fmt.Errorf("read properties: %w", err)
	}
	params := root.LookupPath(parameterPath)
	if !params.Exists() {
		return fmt.Errorf("definition has no template.parameter")
	}
	return params.Unify(value).Validate(cue.Concrete(true))
}

// Rendered is what a template produces: a component's output, the extra
// resources in outputs, and a trait's patch. Missing parts are nil.
type Rendered struct {
	Output  map[string]any
	Outputs map[string]any
	Patch   map[string]any
}

// Render evaluates a component or trait template for the given KubeVela
// context (name, namespace, output, ...) and properties.
func Render(def Definition, context map[string]any, props any) (Rendered, error) {
	root, err := compile(def)
	if err != nil {
		return Rendered{}, err
	}
	root = root.FillPath(contextPath, context).FillPath(parameterPath, props)
	var out Rendered
	for _, part := range []struct {
		path cue.Path
		dst  *map[string]any
	}{{outputPath, &out.Output}, {outputsPath, &out.Outputs}, {patchPath, &out.Patch}} {
		if err := decode(root.LookupPath(part.path), part.dst); err != nil {
			return Rendered{}, fmt.Errorf("render %s: %w", part.path, err)
		}
	}
	return out, nil
}

// decode leaves *out nil when v does not exist.
func decode(v cue.Value, out *map[string]any) error {
	if !v.Exists() {
		return nil
	}
	if err := v.Validate(cue.Concrete(true)); err != nil {
		return err
	}
	return v.Decode(out)
}

// compile adds an open context so templates that read context.* compile.
func compile(def Definition) (cue.Value, error) {
	v := cuecontext.New().CompileString("context: {...}\n" + def.ToCue())
	if err := v.Err(); err != nil {
		return cue.Value{}, fmt.Errorf("compile generated CUE: %w", err)
	}
	return v, nil
}
