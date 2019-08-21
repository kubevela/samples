// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Fireworks.Common
{
    using System;

    public partial class PingClient
    {
        public class ObjectInfo
        {
            private const string OBJECT_TYPE = "OBJECT_TYPE";
            private const string OBJECT_VERSION = "OBJECT_VERSION";
            private const string OBJECT_ID = "Fabric_Id";

            public ObjectInfo(string type, string version, string id)
            {
                this.Type = type;
                this.Version = version;
                this.Id = id;
            }

            public string Id { get; private set; }

            public string Type { get; private set; }

            public string Version { get; private set; }

            public static ObjectInfo FromEnvironment()
            {
                var objectType = "worker";
                if (Environment.GetEnvironmentVariable(OBJECT_TYPE) != null)
                {
                    objectType = Environment.GetEnvironmentVariable(OBJECT_TYPE);
                }

                var objectVersion = "v1";
                if (Environment.GetEnvironmentVariable(OBJECT_VERSION) != null)
                {
                    objectVersion = Environment.GetEnvironmentVariable(OBJECT_VERSION);
                }
               
                var objectId = Guid.NewGuid().ToString(); ;
                if (Environment.GetEnvironmentVariable(OBJECT_ID) != null)
                {
                    objectId = Environment.GetEnvironmentVariable(OBJECT_ID);
                }

                return new ObjectInfo(objectType, objectVersion, objectId);
            }
        }
    }
}

