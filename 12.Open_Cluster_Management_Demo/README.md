# OCM-KubeVela-Demo

This is a simple version of demo for KubeCon China topic **"Build and Manage Multi-Cluster Application With Consistent Experience"**.

In this guide, you can setup a simple multi-cluster application with KubeVela and OCM. If you would like to re-implement the full demo (including advanced features such as GitOps and Cloud Resource), you can read [Advanced Doc](https://github.com/wonderflow/ocm-kubevela-demo/tree/advanced) for more details.

## Prerequisite

### Preparation

Adding official kubevela helm charts to your local repository:

```shell
$ helm repo add kubevela https://charts.kubevela.net/core
$ helm repo update
$ helm search repo vela -l --version '>=1.3.0'
NAME                            CHART VERSION           APP VERSION             DESCRIPTION                                       
...
```

### Installation

1. Install KubeVela on your control plane (kubernetes cluster).

```shell
$ helm install \
    --create-namespace -n vela-system \
    kubevela kubevela/vela-core \
    --version 1.3.0 \
    --set multicluster.enabled=true  \
    --wait
```

2. Check the installation of the KubeVela operator.

```shell
$ kubectl -n vela-system get pod
NAME                                        READY   STATUS    RESTARTS   AGE
kubevela-cluster-gateway-79d785cc89-rpcfk   1/1     Running   0          56m
kubevela-vela-core-85644b9fb4-qxzbb         1/1     Running   0          56m
```

3. Install Vela CLI on your computer.

```shell
$ brew install kubevela

$ vela version
Version: refs/tags/v1.3.0
```

>  If you encounter any trouble following the instructions above, please check our [official site](https://kubevela.io/docs/install#2-install-kubevela) for troubleshooting.

#### Install OCM hub cluster control plane

1. Enabling OCM addons for setting up multi-cluster control plane:

```shell
$ vela addon enable ocm-hub-control-plane 
Successfully enable addon:ocm-hub-control-plane 

$ vela addon status ocm-hub-control-plane 
addon ocm-hub-control-plane status is enabled
```

2. Check the OCM installation on multi-cluster control plane

```shell
$ kubectl -n open-cluster-management get deployment
NAME                         READY   UP-TO-DATE   AVAILABLE   AGE
cluster-manager-controller   1/1     1            1           4m1s

$ kubectl -n open-cluster-management-hub get deployment
NAME                                          READY   UP-TO-DATE   AVAILABLE   AGE
cluster-manager-hub-placement-controller      3/3     3            3           3m42s
cluster-manager-hub-registration-controller   3/3     3            3           3m42s
cluster-manager-hub-registration-webhook      3/3     3            3           3m42s
cluster-manager-hub-work-webhook              3/3     3            3           3m42s
```

3. Joining a managed cluster to the OCM control plane:

```shell
$ vela cluster join \
     <path to the kubeconfig of your joining managed cluster> \
     --in-cluster-boostrap=false \
     -t ocm \
     --name my-cluster
Hub cluster all set, continue registration.
Using the api endpoint from hub kubeconfig "https://<ManagedCluster IP>:6443" as registration entry.
Successfully prepared registration config.
Registration operator successfully deployed.
Registration agent successfully deployed.
Successfully found corresponding CSR from the agent.
Approving the CSR for cluster "my-cluster".
Successfully add cluster my-cluster, endpoint: <ManagedCluster IP>.

$ vela cluster list
CLUSTER         TYPE                            ENDPOINT
my-cluster      OCM ManagedServiceAccount       - 
```

Note that `--in-cluster-boostrap=false` is not required when the joining member 
cluster can directly access the hub cluster in a flattened network. e.g. in the
same VPC.

4. Install OCM addons

##### Installing addons

```shell
# install the addons
$ vela addon enable ocm-gateway-manager-addon
# check addon installation
$ kubectl get managedclusteraddon -n my-cluster
NAMESPACE           NAME                    AVAILABLE   DEGRADED   PROGRESSING
my-cluster          cluster-proxy           True     
my-cluster          managed-serviceaccount  True     
my-cluster          cluster-gateway         True  
# check gateway api registration
$ kubectl get clustergateway
NAME       PROVIDER   CREDENTIAL-TYPE       ENDPOINT-TYPE
my-cluster              ServiceAccountToken   ClusterProxy
$ kubectl get --raw="/apis/cluster.core.oam.dev/v1alpha1/clustergateways/my-cluster/proxy/healthz"
```

## Deploy your multi-cluster application

```shell
$ cat <<EOF | kubectl apply -f -
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: nginx
spec:
  components:
    - name: nginx
      type: webservice
      properties:
        image: nginx
  policies:
    - type: topology
      name: my-clusters
      properties:
        clusters: ["my-cluster"]
    - type: override
      name: override-nginx-1-20
      properties:
        components:
          - name: nginx
            properties:
              image: nginx:1.20
  workflow:
    steps:
      - name: deploy-my-clusters
        type: deploy
        properties:
          policies: ["my-clusters"]
EOF
```

2. Check application status

```shell
vela status nginx
```
Then you are supposed to see the following results:
```
About:
  Name:      	nginx                        
  Namespace: 	default                      
  Created at:	2022-03-25 19:14:49 +0800 CST
  Status:    	running                      
Workflow:
  mode: StepByStep
  finished: true
  Suspend: false
  Terminated: false
  Steps
  - id:yh4a62we9r
    name:deploy-beijing
    type:deploy
    phase:succeeded 
    message:
Services:
  - Name: nginx  Env: Control plane cluster
    Type: webservice
    healthy Ready:1/1
    Traits:
```

3. Check running logs

```shell
vela logs nginx
```

4. Enter the pods:

```shell
vela exec nginx -i -t -- /bin/sh
```

5. Port forward your app:

```shell
vela port-forward nginx
```