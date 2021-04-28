## KubeVela Samples

This repository contains a series of samples that implemented with KubeVela. 
Each subsequent sample includes instructions for installing the application using KubeVela. 
Highly recommend to understand the concepts documented [here](https://kubevela.io/docs/) first.

## Supported KubeVela version

KubeVela is a modern application platform that is **fully self-service** and
**simple yet reliable**.
KubeVela has released [version
1.0](https://github.com/oam-dev/kubevela/releases) with numbers of powerful
features and built-in capabilities.
The master branch may include breaking changes, therefore ensure that you're
running the samples with the right version of KubeVela. 
Samples in this repo is been tested with the current latest version (KubeVela-v1.0.3). 
Please install KubeVela as per the instructions [here](https://kubevela.io/docs/install).

## Samples

| Sample                   | Description                                                                                                                                                                                    |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [1. hello-world](./1.Helloworld)            | Demonstrates how to create simple component and configuration for a python application.                                                                                                      |
| [2. ServiceTracker App](./2.ServiceTracker_App)       | This is an example microservices application with a Javascript Web UI, a MongoDB database, and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed                                                                                              |
| [3. BikeSharing 360 Multi Container App](./3.BikeSharing360_MultiContainer_App) | This is an example microservices application with an ASP.NET Core Webform UI,  and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed |
| [4. BikeSharing 360 Single Container App](./4.BikeSharing360_SingleContainer_App) | Demonstrates KubeVela implementation of BikeSharing 360 app created in a Single Container. This sample has a single component and a configuration |
| [6. Knative_with_Cloud_Resource_App](./6.Knative_with_Cloud_Resource_App) | Demonstrates how KubeVela helps Knative Configuration/Route to interact with cloud resources provisioned by Crossplane. |
| [7. GoogleCloudPlatform_MicroServices_Demo](./7.GoogleCloudPlatform_MicroServices_Demo) | This is an example application consists of a 10-tier microservices application. The idea is that various app developers would create Workload for their corresponding apps. The overall config will add traits and allow the app to be fully deployed|

To get started with the samples, clone this repository and follow instructions in each sample:
```bash
git clone https://github.com/oam-dev/samples.git
```
