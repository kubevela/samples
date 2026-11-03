// Package traits holds the module's TraitDefinitions; each file registers
// its definition with defkit in init().
package traits

import (
	"strconv"

	"github.com/oam-dev/kubevela/pkg/definition/defkit"
)

// HighAvailabilityType is the trait type an Application refers to. It is
// not high-availability, the CUE trait's name, because both are installed
// side by side: the aws-cue stage uses the CUE one and the devkit stages
// this one.
const HighAvailabilityType = "high-availability-devkit"

// The levels an Application can ask for.
const (
	LevelDev       = "dev"
	LevelStaging   = "staging"
	LevelProd      = "prod"
	LevelProdLocal = "prod-local"
)

// HighAvailabilityProperties are the high-availability parameters, typed so
// tests can set them and paramcheck can hold them to the trait's parameters.
type HighAvailabilityProperties struct {
	Level string `json:"level,omitempty"`
}

// Anti-affinity modes. Preferred spreads pods across nodes when it can;
// required refuses to put two on one node.
const (
	antiAffinityPreferred = "preferred"
	antiAffinityRequired  = "required"
)

// posture is what one level gets. Changing a value here changes every app
// that asks for the level.
type posture struct {
	minReplicas, maxReplicas int
	// budget is the PodDisruptionBudget field and value; nil means no budget.
	budget     *disruptionBudget
	zoneSpread bool
	// antiAffinity is a mode above; empty means none.
	antiAffinity string
}

type disruptionBudget struct {
	field string // minAvailable or maxUnavailable
	value any
}

// levels lists the levels in the order the CUE is generated, so the output
// is the same on every run.
var levels = []string{LevelDev, LevelStaging, LevelProd, LevelProdLocal}

var postures = map[string]posture{
	LevelDev: {minReplicas: 1, maxReplicas: 2},
	LevelStaging: {
		minReplicas: 1, maxReplicas: 3,
		budget:       &disruptionBudget{"maxUnavailable", 1},
		antiAffinity: antiAffinityPreferred,
	},
	LevelProd: {
		minReplicas: 3, maxReplicas: 6,
		budget:       &disruptionBudget{"maxUnavailable", 2},
		zoneSpread:   true,
		antiAffinity: antiAffinityRequired,
	},
	// prod without zone spread, which never schedules on a cluster whose
	// nodes have no zone label, such as k3d.
	LevelProdLocal: {
		minReplicas: 3, maxReplicas: 6,
		budget:       &disruptionBudget{"maxUnavailable", 1},
		antiAffinity: antiAffinityPreferred,
	},
}

// Settings every level shares.
const (
	targetCPUUtilization  = 70
	preferredWeight       = 100
	componentLabel        = "app.oam.dev/component"
	hostnameTopologyKey   = "kubernetes.io/hostname"
	zoneTopologyKey       = "topology.kubernetes.io/zone"
	scaleDownStabilizeSec = 300
	scaleUpStabilizeSec   = 60
)

// HighAvailability is the Go version of
// ../../definitions/traits/high-availability.cue: an app asks for a level
// and gets the HPA, PodDisruptionBudget, topology spread and anti-affinity
// that level calls for.
func HighAvailability() *defkit.TraitDefinition {
	level := defkit.String("level").Default(LevelDev).Values(levels...).
		Description("Environment level that selects the HA posture (dev, staging, prod, prod-local)")

	return defkit.NewTrait(HighAvailabilityType).
		Description("Auto-inject HA best practices (HPA, PDB, topology spread, anti-affinity) by environment level. The HPA scales on CPU, so the workload needs a CPU request.").
		AppliesTo("deployments.apps", "statefulsets.apps").
		PodDisruptive(true).
		Params(level).
		Template(func(tpl *defkit.Template) {
			for _, name := range levels {
				addPosture(tpl, level.Eq(name), postures[name])
			}
		})
}

// addPosture adds one level's resources and pod settings under its condition.
func addPosture(tpl *defkit.Template, when defkit.Condition, p posture) {
	tpl.OutputsGroupIf(when, func(g *defkit.OutputGroup) {
		g.Add("hpa", autoscaler(p))
		if p.budget != nil {
			g.Add("pdb", disruptionBudgetFor(p.budget))
		}
	})

	patch := tpl.Patch().If(when)
	placePods(patch, p)
	patch.EndIf()
}

// placePods adds the level's topology spread and anti-affinity to the pod spec.
func placePods(patch *defkit.PatchResource, p posture) {
	if p.zoneSpread {
		patch.Set("spec.template.spec.topologySpreadConstraints", defkit.NewArray().Item(
			defkit.NewArrayElement().
				Set("maxSkew", defkit.Lit(1)).
				Set("topologyKey", defkit.Lit(zoneTopologyKey)).
				Set("whenUnsatisfiable", defkit.Lit("DoNotSchedule")).
				Set("labelSelector", ownPods())))
	}
	switch p.antiAffinity {
	case antiAffinityPreferred:
		patch.Set("spec.template.spec.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution",
			defkit.NewArray().Item(defkit.NewArrayElement().
				Set("weight", defkit.Lit(preferredWeight)).
				Set("podAffinityTerm", defkit.NewArrayElement().
					Set("topologyKey", defkit.Lit(hostnameTopologyKey)).
					Set("labelSelector", ownPods()))))
	case antiAffinityRequired:
		patch.Set("spec.template.spec.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution",
			defkit.NewArray().Item(defkit.NewArrayElement().
				Set("topologyKey", defkit.Lit(hostnameTopologyKey)).
				Set("labelSelector", ownPods())))
	}
}

func autoscaler(p posture) *defkit.Resource {
	vela := defkit.VelaCtx()
	return defkit.NewResource("autoscaling/v2", "HorizontalPodAutoscaler").
		Set("metadata.name", vela.Name()).
		Set("metadata.namespace", vela.Namespace()).
		Set("spec.scaleTargetRef.apiVersion", defkit.Lit("apps/v1")).
		Set("spec.scaleTargetRef.kind", defkit.Reference("context.output.kind")).
		Set("spec.scaleTargetRef.name", vela.Name()).
		Set("spec.minReplicas", defkit.Lit(p.minReplicas)).
		Set("spec.maxReplicas", defkit.Lit(p.maxReplicas)).
		Set("spec.metrics", defkit.NewArray().Item(defkit.NewArrayElement().
			Set("type", defkit.Lit("Resource")).
			Set("resource", defkit.NewArrayElement().
				Set("name", defkit.Lit("cpu")).
				Set("target", defkit.NewArrayElement().
					Set("type", defkit.Lit("Utilization")).
					Set("averageUtilization", defkit.Lit(targetCPUUtilization)))))).
		Set("spec.behavior.scaleDown.stabilizationWindowSeconds", defkit.Lit(scaleDownStabilizeSec)).
		Set("spec.behavior.scaleDown.policies", scalingPolicy(50)).
		Set("spec.behavior.scaleUp.stabilizationWindowSeconds", defkit.Lit(scaleUpStabilizeSec)).
		Set("spec.behavior.scaleUp.policies", scalingPolicy(100))
}

// scalingPolicy allows changing the replica count by percent each minute.
func scalingPolicy(percent int) defkit.Value {
	return defkit.NewArray().Item(defkit.NewArrayElement().
		Set("type", defkit.Lit("Percent")).
		Set("value", defkit.Lit(percent)).
		Set("periodSeconds", defkit.Lit(60)))
}

func disruptionBudgetFor(b *disruptionBudget) *defkit.Resource {
	vela := defkit.VelaCtx()
	return defkit.NewResource("policy/v1", "PodDisruptionBudget").
		Set("metadata.name", vela.Name()).
		Set("metadata.namespace", vela.Namespace()).
		Set("spec.selector", ownPods()).
		Set("spec."+b.field, defkit.Lit(b.value))
}

// ownPods selects the component's pods by the label KubeVela puts on them.
// Inside an ArrayElement keys are written as given, so nested structs are
// nested elements and a key that is not a CUE identifier is quoted here.
func ownPods() defkit.Value {
	return defkit.NewArrayElement().Set("matchLabels", defkit.NewArrayElement().
		Set(strconv.Quote(componentLabel), defkit.VelaCtx().Name()))
}

func init() {
	defkit.Register(HighAvailability())
}
