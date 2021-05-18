## KubeVela Samples

These samples demonstrate how to ship applications through
[KubeVela](https://kubevela.io).
Each sample walks you through only a few steps required to ship an application
super-quickly by KubeVela.

## :warning: Intended Audiences

KubeVela are designated to serve two typical kinds of users, one is the platform
builder, the other is end-user of platform.
Platform builders leverage KubeVela to develope PaaS platform (based on
Kubernetes), while end-users consume the platform capabilities to ship or
manage their applications through KubeVela.
To avoid confusion and ambiguity, it's necessary to figure out which role you
are playing and which role is the intended audience for the samples or any
other documents about KubeVela.

:exclamation: **End-users** are intended audiences for samples in this repository.

As an end-user, you should know below as prerequisite:
- [basic concepts](https://kubevela.io/docs/) of KubeVela
- how to [install KubeVela](https://kubevela.io/docs/install/)
- how to [check detailed schema of a given capability](https://kubevela.io/docs/developers/references/README)
- everything about your own application (of course)

As an end-user, you should NOT worry about:
- how a capability works under the hood
- how to define a capability schema
- how to implement a capability

> Above stuff is in the domain of platform builders.

## Generic Steps To Ship An Application

No matter how complex the application is or how many operational characteristics
the application needs, KubeVela only requires three steps for end-users to ship
their applications, as significantly reduces the study cost and on-board
difficulty for them.

- Determine Component Type
- Choose Traits For Components
- Assemble Components & Traits In Application

Each step will be explained and demonstrated in the samples.

## Supported KubeVela version

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
| [1. hello-world](./1.Helloworld)            | Demonstrates how to ship a simple python application.                                                                                                      |
| [2. ServiceTracker App](./2.ServiceTracker_App)       | This is an example microservices application with a Javascript Web UI, a MongoDB database, and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed                                                                                              |
| [3. BikeSharing 360 Multi Container App](./3.BikeSharing360_MultiContainer_App) | This is an example microservices application with an ASP.NET Core Webform UI,  and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed |
| [4. BikeSharing 360 Single Container App](./4.BikeSharing360_SingleContainer_App) | Demonstrates KubeVela implementation of BikeSharing 360 app created in a Single Container. This sample has a single component and a configuration |
| [6. Knative App](./6.Knative_App) | Demonstrates how KubeVela helps Knative Configuration/Route to interact with cloud resources provisioned by Crossplane. |
| [7. GoogleCloudPlatform MicroServices Demo](./7.GoogleCloudPlatform_MicroServices_Demo) | This is an example application consists of a 10-tier microservices application. The idea is that various app developers would create Workload for their corresponding apps. The overall config will add traits and allow the app to be fully deployed|

To get started with the samples, clone this repository and follow instructions in each sample:
```bash
git clone https://github.com/oam-dev/samples.git
```
