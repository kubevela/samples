# Hydra Example: Fireworks 

## Introduction 
This folder contains the source code and documentation on the fireworks demo running on the Hydra Managed Service (soon also on the open source implementation). 

## Purpose 

The purpose of this proof-of-concept is as follows: 

- Illustrate that applications defined with the Mesh specification can be defined using the Hydra spec

- Within the specification, this will stress test the following:
    - Reuse components
    - Service discovery 
    - Manual scaling 
    - Public Ingress 
    - Network Scope (bringing existing network)

## Out of Scope 

This proof of concept is not concerned with addressing the following: 

- Separation of concerns and the personas that author each of the YAML files 
- Local development of indvidual services
- Dependency management and testing during development
- Handoff between development and operations including a CI/CD pipeline 
- Any part of the Hydra specification not explicitly mentioned in the **Purpose**

## Scenario & Architecture 

The goal of this application is to build a basic scalable application into an organizations existing Virtual Network. The assumption is that the development team has tested their code and are authoring their `component.yaml` file. 

The Fireworks application is split into two parts. The `workers` ping the frontend every **x** secondsd with the color of their firework. The `web` is responsible for simply displaying the color of the fireworks. 

![Fireworks Architecture](./media/fireworks_architecture.PNG)

## Creating the Components

### Developer Concerns 
This deployment consists of two components. A `fireworks-web` component which is the frontend and a single worker component called `fireworks-worker`. The component manifests can be found in the `src/web/manifests` and `src/worker/manifests` folders. These files describe developer concerns such as environment variables required for the container, the container image, the port. 

Both components run as a replicated service to allow the app operator to scale the components as required. 

### Application Operator Concerns

The application operator can instantiate these components in the operational config to create their application. The `fireworks-worker` components exposes an environment variable which allows different colors of the fireworks. This way, a single component can be used to create different instances; each with their own color. 

```yaml
components:
    - componentName: fireworks-web
      instanceName: fireworks-web
      replicaCount: "[fromVariable(web-count)]"
      parameterValues: 
            - name: urls 
              value: "[fromVariable(urls)]"
            - name: objectcounter
              value: "[fromVariable(objectcounter)]"
    - componentName: fireworks-worker
      instanceName: fireworks-worker1
      replicaCount: "[fromVariable(worker-count)]"
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color1)]"              
    - componentName: fireworks-worker
      instanceName: fireworks-worker2
      replicaCount: "[fromVariable(worker-count)]"
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color2)]"                 
    - componentName: fireworks-worker
      instanceName: fireworks-worker3
      replicaCount: "[fromVariable(worker-count)]"      
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color3)]"                  
```

All environment variables need to be passed to the components at run time and can be declared using **variables** in the `/src/manifests/operationalconfig.yaml` file. 

```yaml
variables:
- name: web-port
    value: 8080
- name: urls 
    value: "http://+:8080"
- name: objectcounter
    value: "1"
- name: color1
    value: "red"
- name: color2 
    value: "green"
- name: color3 
    value: "blue"
- name: web-count
    value: 1
- name: worker-count
    value: 1
```

## Provisioning into existing Virtual Network

There is an assumption that there is an existing Azure Virtual Network resource named `fireworks-vnet` in the customers subscription. 

1. The application operator needs to first provision an empty subnet for the application. 

```bash
az network vnet subnet create --address-prefixes 10.0.0.1/24 --name fireworks-subnet --resource-group fireworks --vnet-name fireworks-vnet
```

2. In the `/src/manifests/operationalconfig.yaml` file, create a **scopes** section and add the appropriate variables in the **Variable** section.

```yaml
scopes: 
- name: fireworks-vnet
    type: core.hydra.io/v1alpha1.Network
    properties:
    - name: networkName
        value: "[fromVariable(network_name_value)]"
    - name: subnetPrefix          
        value: "[fromVariable(subnet_prefix_value)]"

variables:
- name: network_name_value 
    value: ""
- name: subnetPrefix
    value: ""
```
3. Add each of the instantianted components into the network scope by modifying the **components** section. 

```yaml
components:
    - componentName: fireworks-web
      instanceName: fireworks-web
      replicaCount: "[fromVariable(web-count)]"
      parameterValues: 
            - name: urls 
              value: "[fromVariable(urls)]"
            - name: objectcounter
              value: "[fromVariable(objectcounter)]"
      applicationScopes: 
        - fireworks-vnet
    - componentName: fireworks-worker
      instanceName: fireworks-worker1
      replicaCount: "[fromVariable(worker-count)]"
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color1)]"     
      applicationScopes: 
        - fireworks-vnet               
    - componentName: fireworks-worker
      instanceName: fireworks-worker2
      replicaCount: "[fromVariable(worker-count)]"
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color2)]"       
      applicationScopes: 
        - fireworks-vnet              
    - componentName: fireworks-worker
      instanceName: fireworks-worker3
      replicaCount: "[fromVariable(worker-count)]"      
      parameterValues: 
            - name: objecttype
              value: "[fromVariable(color3)]"       
      applicationScopes: 
        - fireworks-vnet               
```
## Exposing the web to the public internet 

To expose the `web` component to the internet, we augment the component with an **ingress-trait**. 

```yaml
- componentName: fireworks-web
    instanceName: fireworks-web
    replicaCount: "[fromVariable(web-count)]"
    parameterValues: 
        - name: urls 
            value: "[fromVariable(urls)]"
        - name: objectcounter
            value: "[fromVariable(objectcounter)]"
    traits:
    - name: fireworks-ingress
        type: core.hydra.io/v1alpha1.Ingress
        public: true
        parameterValues:
        - name: port
            value: "[fromVariable(web-port)]"
    applicationScopes: 
    - fireworks-vnet
```

## Deploy the application into Hydra 

The operational config and component YAMLs can be deployed to either the Kubernetes implementation or the Azure Managed Service. 

### Deploy to the Azure Managed Service

1. Login to Azure from the CLI 

```bash
az login
```

2. Select a subscription 

```bash
az account set -s subscription_id
```

3. Create a resource group 

```bash
az group create -g fireworks -l westus 
```

4. Add the Hydra CLI extension 

```bash
az extension add --source \\winfabfs\public\vibha\hydra-0.1.1-py2.py3-none-any.whl
```

5. Deploy the application. This command will recursively find all YAML files in your `manifests` folders and deploy them together. Note that the variables declared in the `operationalconfig.yaml` are passed in as parameters. 

```bash
az hydra deployment create --input-yaml-files ./src --parameters '[{"name":"web-port","value":8080},{"name":"urls","value":"http://+:8080"},{"name":"objectcounter","value":"1"},{"name":"color1","value":"red"},{"name":"color2","value":"green"},{"name":"color3","value":"blue"},{"name":"web-count","value":5},{"name":"worker-count","value":1},{"name":"network_name_value","value":"fireworks_vnet"},{"name":"subnetPrefix","value":"10.0.0.1/24"}]'
```

### Deploy to Kubernetes 
