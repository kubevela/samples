## Rudr Samples

This repository contains a series of samples that implemented with Rudr. Each subsequent sample includes instructions for installing the application using Rudr.

## Supported Rudr Runtime version(s)

Rudr is currently under community development with preview releases.  The master branch includes breaking changes, therefore ensure that you're running the samples with the right version of Rudr runtime. Samples in this repo is been tested with the current latest version of rudr : (rudr-0.1.0). Please install rudr as per the instructions [here (https://github.com/oam-dev/rudr/blob/master/docs/setup/install.md)]

## Samples

| Sample                   | Description                                                                                                                                                                                    |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [1. hello-world](./1.Helloworld)            | Demonstrates how to create simple component and configuration for a python application.                                                                                                      |
| [2. ServiceTracker App](./2.hello-kubernetes)       | This is an example microservices application with a Javascript Web UI, a MongoDB database, and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed                                                                                              |
| [3. BikeSharing 360 Multi Container App](./3.BikeSharing360_MultiContainer_App) | This is an example microservices application with an ASP.NET Core Webform UI,  and a series of API microservices. The idea is that various app developers would create Components for their corresponding apps. The overall config will add traits and allow the app to be fully deployed |
| [4. BikeSharing 360 Single Container App](./4.BikeSharing360_SingleContainer_App) | Demonstrates Rudr implementation of BikeSharing 360 app created in a Single Container |

To get started with the samples, clone this repository and follow instructions in each sample:
```bash
git clone https://github.com/oam-dev/samples.git
```
