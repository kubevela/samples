package main

import (
	"fmt"
	"os"

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
		traits.VisitElements(func(node *yaml.RNode) error {

			trait, err := node.Pipe(yaml.Lookup("trait"))
			if err != nil {
				s, _ := r.String()
				return fmt.Errorf("%v: %s", err, s)
			}
			meta, _ := trait.GetMeta()
			if meta.ApiVersion == "core.oam.dev/v1alpha2" && meta.Kind == "ManualScalerTrait" {
				// set scaler
				err := trait.PipeE(
					// lookup resources.requests.cpu, creating the field as a
					// ScalarNode if it doesn't exist
					yaml.Lookup("spec", "replicaCount"),
					// set the field value to the cpuSize
					yaml.Set(yaml.NewScalarRNode(replicaNumber)))
				if err != nil {
					s, _ := r.String()
					return fmt.Errorf("%v: %s", err, s)
				}
				changed = true
			}
			node.PipeE(yaml.SetField("trait", trait))
			return nil
		})
		if changed {
			node.PipeE(yaml.SetField("traits", traits))
		}
		return nil
	})
	return nil
}
