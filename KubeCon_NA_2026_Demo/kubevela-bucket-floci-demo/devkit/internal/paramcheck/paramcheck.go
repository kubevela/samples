// Package paramcheck compares a definition's parameters with the Go struct
// that Applications use to set them, so the two cannot drift apart.
package paramcheck

import (
	"fmt"
	"reflect"
	"sort"
	"strings"

	"github.com/oam-dev/kubevela/pkg/definition/defkit"
)

// Diff returns one line per mismatch between params and the JSON fields of
// props: a parameter with no field, a field with no parameter, or a required
// parameter whose field is marked omitempty (Go would silently drop it).
func Diff(params []defkit.Param, props any) []string {
	fields := jsonFields(reflect.TypeOf(props))
	var diffs []string
	for _, p := range params {
		omitEmpty, ok := fields[p.Name()]
		switch {
		case !ok:
			diffs = append(diffs, fmt.Sprintf("parameter %q has no struct field", p.Name()))
		case p.IsRequired() && omitEmpty:
			diffs = append(diffs, fmt.Sprintf("required parameter %q is omitempty", p.Name()))
		}
		delete(fields, p.Name())
	}
	for name := range fields {
		diffs = append(diffs, fmt.Sprintf("struct field %q is not a parameter", name))
	}
	sort.Strings(diffs)
	return diffs
}

// jsonFields maps each JSON field name of t to whether it is omitempty.
func jsonFields(t reflect.Type) map[string]bool {
	fields := map[string]bool{}
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		if !field.IsExported() {
			continue
		}
		name, opts, _ := strings.Cut(field.Tag.Get("json"), ",")
		if name == "-" && opts == "" {
			continue
		}
		if name == "" {
			name = field.Name
		}
		fields[name] = strings.Contains(opts, "omitempty")
	}
	return fields
}
