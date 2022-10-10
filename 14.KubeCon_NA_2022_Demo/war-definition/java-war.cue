"java-war": {
	alias: ""
	annotations: {}
	attributes: {
		workload: {
			definition: {
				apiVersion: "apps/v1"
				kind:       "Deployment"
			}
			type: "deployments.apps"
		}
		status: {
			customStatus: #"""
				ready: {
					readyReplicas: *0 | int
				} & {
					if context.output.status.readyReplicas != _|_ {
						readyReplicas: context.output.status.readyReplicas
					}
				}
				message: "Ready:\(ready.readyReplicas)/\(context.output.spec.replicas)"
				"""#
			healthPolicy: #"""
				ready: {
					updatedReplicas:    *0 | int
					readyReplicas:      *0 | int
					replicas:           *0 | int
					observedGeneration: *0 | int
				} & {
					if context.output.status.updatedReplicas != _|_ {
						updatedReplicas: context.output.status.updatedReplicas
					}
					if context.output.status.readyReplicas != _|_ {
						readyReplicas: context.output.status.readyReplicas
					}
					if context.output.status.replicas != _|_ {
						replicas: context.output.status.replicas
					}
					if context.output.status.observedGeneration != _|_ {
						observedGeneration: context.output.status.observedGeneration
					}
				}
				isHealth: (context.output.spec.replicas == ready.readyReplicas) && (context.output.spec.replicas == ready.updatedReplicas) && (context.output.spec.replicas == ready.replicas) && (ready.observedGeneration == context.output.metadata.generation || ready.observedGeneration > context.output.metadata.generation)
				"""#
		}
	}
	description: ""
	labels: {}
	type: "component"
}

template: {
	output: {
		apiVersion: "apps/v1"
		kind:       "Deployment"
		metadata: {
			name:      context.name
			namespace: context.namespace
		}
		spec: {
			replicas: parameter.replicas
			selector: {
				matchLabels: {
					"app.oam.dev/component": context.name
				}
			}
			template: {
				metadata: {
					labels: {
						"app.oam.dev/name":      context.appName
						"app.oam.dev/component": context.name
						"app.oam.dev/revision":  context.revision
					}
				}
				spec: {
					initContainers: [{
						name:  "prepare-war"
						image: "busybox"
						if parameter["deployToRoot"] != _|_ {
							if parameter["deployToRoot"] {
								command: ["wget", "-O", "/usr/local/tomcat/webapps/ROOT.war", parameter["warURL"]]
							}
						}
						if parameter["deployToRoot"] == _|_ {
							command: ["wget", "-P", "/usr/local/tomcat/webapps/", parameter["warURL"]]
						}
						volumeMounts: [{
							name:      "webapps"
							mountPath: "/usr/local/tomcat/webapps"
						}]
					}]
					containers: [{
						name:  context.name
						image: "tomcat:" + parameter["envVersion"]
						if parameter["cpu"] != _|_ {
							resources: {
								limits: cpu:   parameter.cpu
								requests: cpu: parameter.cpu
							}
						}
						if parameter["memory"] != _|_ {
							resources: {
								limits: memory:   parameter.memory
								requests: memory: parameter.memory
							}
						}
						ports: [{
							containerPort: 8080
							name:          "webapp"
						}]
						_envs: {
							custom: *parameter["env"] | []
							inner: [
								if parameter["javaOpts"] != _|_ {
									{
										name:  "JAVA_OPTS"
										value: parameter.javaOpts
									}
								},
							]
						}
						env: _envs.custom + _envs.inner
						volumeMounts: [{
							name:      "webapps"
							mountPath: "/usr/local/tomcat/webapps"
						}]
					}]
					volumes: [{
						name: "webapps"
						emptyDir: {}
					}]
				}
			}
		}
	}

	outputs: {
		services: {
			kind:       "Service"
			apiVersion: "v1"
			metadata: {
				name:      context.name
				namespace: context.namespace
			}
			spec: {
				selector: "app.oam.dev/component": context.name
				ports: [{
					name:       context.name
					port:       8080
					targetPort: 8080
				}]
				type: parameter.serviceType
			}
		}
	}

	parameter: {
		// +usage=The URL of the war package.
		warURL: string
		// +usage=Select a environment version([tomcat version]-[jdk version])
		envVersion: *"8-jdk8" | "9-jdk8" | "10-jdk8" | "8-jdk11" | "9-jdk11" | "10-jdk11" | "8-jdk17" | "9-jdk17" | "10-jdk17"
		// +usage=Specifies the number of replicas.
		replicas: *1 | int
		// +usage=Define arguments by using environment variables
		env?: [...{
			name:   string
			value?: string
		}]
		// +usage=Setting the Java Opts configuration.
		javaOpts?: string
		// +usage=Number of CPU units for the service, like `0.5` (0.5 CPU core), `1` (1 CPU core)
		cpu?: string
		// +usage=Specifies the attributes of the memory resource required for the container.
		memory?:       =~"^([1-9][0-9]{0,63})(E|P|T|G|M|K|Ei|Pi|Ti|Gi|Mi|Ki)$"
		deployToRoot?: bool
		// +usage=Specify the service type for exposing war component. Default to be ClusterIP.
		serviceType: *"ClusterIP" | "NodePort" | "LoadBalancer"
	}
}
