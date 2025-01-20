# BikeSharing360

[BikeSharing360 for multiple
containers](https://github.com/microsoft/BikeSharing360_MultiContainer) adapted
for KubeVela.

BikeSharing360 is a fictitious example of a smart bike sharing system with
10,000 bikes distributed in 650 stations located throughout New York City and
Seattle. 
Their vision is to provide a modern and personalized experience to riders and to
run their business with intelligence.

BikeSharing 360 for single containers can be found
[here](../4.BikeSharing360_SingleContainer_App).

## Prerequisites

* Follow the instructions in the
[installation](https://kubevela.io/docs/install) document to get KubeVela
installed.

## Quickstart: Deploy the sample through KubeVela

Deploy the application to Kubernetes cluster.

```shell
$ kubectl apply -f ./KubeVelaManifest
```

Validate that the deployments are created successfully by KubeVela.

```shell
$ kubectl get deploy

NAME                       READY   UP-TO-DATE   AVAILABLE   AGE
bikesharing-email-api      1/1     1            1           17m
bikesharing-feedback-api   1/1     1            1           17m
bikesharing-profile-api    1/1     1            1           17m
bikesharing-ui             1/1     1            1           17m
```

Wait for ingress to be created:

```shell
$ kubectl get ingress

NAME             CLASS    HOSTS             ADDRESS     PORTS   AGE
bikesharing-ui   <none>   bikesharing.com   localhost   80      33s
```

Navigating to bikesharing.com after mapping it to the correct IP address (found by `kubectl get services`) should take you to the home page.

![bikesharing website](./App/img/bikesharing.PNG)

## Copyright and license
* Code and documentation copyright 2016 Microsoft Corp. Code released under the [MIT license](https://opensource.org/licenses/MIT).

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
