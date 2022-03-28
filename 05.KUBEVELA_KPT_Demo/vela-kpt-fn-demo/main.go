package main

import (
	"fmt"
	"os"
	"strings"

	"sigs.k8s.io/kustomize/kyaml/kio"
	"sigs.k8s.io/kustomize/kyaml/yaml"
)

func main() {
	rw := &kio.ByteReadWriter{Reader: os.Stdin, Writer: os.Stdout, KeepReaderAnnotations: true}
	p := kio.Pipeline{
		Inputs:  []kio.Reader{rw},       // read the inputs into a slice
		Filters: []kio.Filter{filter{}}, // run the inject into the inputs
		Outputs: []kio.Writer{rw}}       // copy the inputs to the output
	if err := p.Execute(); err != nil {
		fmt.Fprint(os.Stderr, err)
		os.Exit(1)
	}
	return
}

// filter implements kio.Filter
type filter struct{}

func (filter) Filter(in []*yaml.RNode) ([]*yaml.RNode, error) {
	// inject the resource reservations into each Resource
	for _, r := range in {
		if err := inject(r); err != nil {
			return nil, err
		}
	}
	return in, nil
}

func inject(r *yaml.RNode) error {
	// lookup the components field
	components, err := r.Pipe(yaml.Lookup("spec", "components"))
	if err != nil {
		s, _ := r.String()
		return fmt.Errorf("%v: %s", err, s)
	}
	if components == nil {
		// doesn't have components, skip the Resource
		return nil
	}
	// check annotations
	meta, err := r.GetMeta()
	if err != nil {
		return fmt.Errorf("get meta error, %v", err)
	}

	var replicaNumber string
	if number, found := meta.Annotations["scaler"]; !found {
		return nil
	} else {
		replicaNumber = number
	}
	err = components.VisitElements(func(node *yaml.RNode) error {
		traits, err := node.Pipe(yaml.Lookup("traits"))
		if err != nil {
			s, _ := r.String()
			return fmt.Errorf("%v: %s", err, s)
		}
		var changed = false
		traits.VisitElements(func(curTrait *yaml.RNode) error {
			traitType, err := curTrait.Pipe(yaml.Lookup("type"))
			if err != nil {
				s, _ := r.String()
				return fmt.Errorf("%v: %s", err, s)
			}
			if typeName, _ := traitType.String(); !strings.HasPrefix(typeName, "scaler") {
				return nil
			}
			properties, _ := curTrait.Pipe(yaml.Lookup("properties"))
			if err := properties.PipeE(
				yaml.Lookup("replicas"),
				yaml.Set(yaml.NewScalarRNode(replicaNumber)),
			); err != nil {
				s, _ := r.String()
				return fmt.Errorf("%v: %s", err, s)
			}
			changed = true
			curTrait.PipeE(yaml.SetField("properties", properties))
			return nil
		})
		if changed {
			node.PipeE(yaml.SetField("traits", traits))
		}
		return nil
	})
	return nil
}
