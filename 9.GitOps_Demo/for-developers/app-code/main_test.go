// main_test.go

package main

import (
	"regexp"
	"testing"
)

const verRegex string = `^v?([0-9]+)(\.[0-9]+)?(\.[0-9]+)?` +
	`(-([0-9A-Za-z\-]+(\.[0-9A-Za-z\-]+)*))?` +
	`(\+([0-9A-Za-z\-]+(\.[0-9A-Za-z\-]+)*))?$`

func TestVersion(t *testing.T) {
	if ok, _ := regexp.MatchString(verRegex, VERSION); !ok {
		t.Fatalf("invalid version: %s", VERSION)
	}
}
