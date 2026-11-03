// High Availability Trait, copied from kubevela-one-interface-demos
// (platform/kubevela/traits/high-availability/).
//
// An intent-based trait: the developer asks for a `level` (dev, staging, prod,
// prod-local) and gets the HPA, PodDisruptionBudget, topology spread and pod
// anti-affinity the platform team chose for it.
//
// ../../devkit/traits/high_availability.go is the DevKit version,
// high-availability-devkit, which the devkit stages use; a test checks that
// both render the same for every level.

"high-availability": {
	type: "trait"
	annotations: {}
	labels: {}
	description: "Auto-inject HA best practices (HPA, PDB, topology spread, anti-affinity) by environment level. The HPA scales on CPU, so the workload needs a CPU request."
	attributes: {
		appliesToWorkloads: ["deployments.apps", "statefulsets.apps"]
		podDisruptive: true
	}
}

template: {
	_level: parameter.level

	// What each level gets. Change a value here and every app that asks
	// for the level picks it up.
	_config: {
		dev: {
			hpa: {enabled: true, min:  1, max: 2, cpuUtil: 70}
			pdb: {enabled: false}
			topologySpread: {enabled: false}
			antiAffinity: {enabled: false}
		}
		staging: {
			hpa: {enabled: true, min:  1, max: 3, cpuUtil: 70}
			pdb: {enabled: true, maxUnavailable: 1}
			topologySpread: {enabled: false}
			antiAffinity: {enabled: true, type: "preferred", weight: 100}
		}
		prod: {
			hpa: {enabled: true, min:  3, max: 6, cpuUtil: 70}
			pdb: {enabled: true, maxUnavailable: 2}
			topologySpread: {enabled: true, maxSkew: 1}
			antiAffinity: {enabled: true, type: "required"}
		}
		// For single-node / no-zone local clusters: prod posture without
		// zone-based topology spread (which would never schedule).
		"prod-local": {
			hpa: {enabled: true, min:  3, max: 6, cpuUtil: 70}
			pdb: {enabled: true, maxUnavailable: 1}
			topologySpread: {enabled: false}
			antiAffinity: {enabled: true, type: "preferred", weight: 100}
		}
	}

	_selectedConfig: _config[_level]

	outputs: {
		if _selectedConfig.hpa.enabled {
			hpa: {
				apiVersion: "autoscaling/v2"
				kind:       "HorizontalPodAutoscaler"
				metadata: {
					name:      context.name
					namespace: context.namespace
				}
				spec: {
					scaleTargetRef: {
						apiVersion: "apps/v1"
						kind:       context.output.kind
						name:       context.name
					}
					minReplicas: _selectedConfig.hpa.min
					maxReplicas: _selectedConfig.hpa.max
					metrics: [{
						type: "Resource"
						resource: {
							name: "cpu"
							target: {
								type:               "Utilization"
								averageUtilization: _selectedConfig.hpa.cpuUtil
							}
						}
					}]
					behavior: {
						scaleDown: {
							stabilizationWindowSeconds: 300
							policies: [{type: "Percent", value: 50, periodSeconds:  60}]
						}
						scaleUp: {
							stabilizationWindowSeconds: 60
							policies: [{type: "Percent", value: 100, periodSeconds: 60}]
						}
					}
				}
			}
		}

		if _selectedConfig.pdb.enabled {
			pdb: {
				apiVersion: "policy/v1"
				kind:       "PodDisruptionBudget"
				metadata: {
					name:      context.name
					namespace: context.namespace
				}
				spec: {
					selector: matchLabels: {
						"app.oam.dev/component": context.name
					}
					if _selectedConfig.pdb.minAvailable != _|_ {
						minAvailable: _selectedConfig.pdb.minAvailable
					}
					if _selectedConfig.pdb.maxUnavailable != _|_ {
						maxUnavailable: _selectedConfig.pdb.maxUnavailable
					}
				}
			}
		}
	}

	patch: {
		spec: template: spec: {
			if _selectedConfig.topologySpread.enabled {
				topologySpreadConstraints: [{
					maxSkew:           _selectedConfig.topologySpread.maxSkew
					topologyKey:       "topology.kubernetes.io/zone"
					whenUnsatisfiable: "DoNotSchedule"
					labelSelector: matchLabels: {
						"app.oam.dev/component": context.name
					}
				}]
			}

			if _selectedConfig.antiAffinity.enabled {
				affinity: podAntiAffinity: {
					if _selectedConfig.antiAffinity.type == "preferred" {
						preferredDuringSchedulingIgnoredDuringExecution: [{
							weight: _selectedConfig.antiAffinity.weight
							podAffinityTerm: {
								topologyKey: "kubernetes.io/hostname"
								labelSelector: matchLabels: {
									"app.oam.dev/component": context.name
								}
							}
						}]
					}
					if _selectedConfig.antiAffinity.type == "required" {
						requiredDuringSchedulingIgnoredDuringExecution: [{
							topologyKey: "kubernetes.io/hostname"
							labelSelector: matchLabels: {
								"app.oam.dev/component": context.name
							}
						}]
					}
				}
			}
		}
	}

	parameter: {
		// +usage=Environment level that selects the HA posture (dev, staging, prod, prod-local)
		level: *"dev" | "staging" | "prod" | "prod-local"
	}
}
