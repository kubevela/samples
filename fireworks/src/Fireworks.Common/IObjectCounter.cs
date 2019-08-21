// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Samples.Fireworks.Common
{
    using System;

    public interface IObjectCounter
    {
        TimeSpan RefreshInterval { get; }

        string GetCountsJson();

        void CountObject(string id, string type, string version);
    }
}
