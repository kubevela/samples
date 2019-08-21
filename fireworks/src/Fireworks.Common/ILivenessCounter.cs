// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Samples.Fireworks.Common
{
    using System.Collections.Generic;

    public interface ILivenessCounter<T>
    {
        void ReportAlive(T group, long numberOfAliveItems = 1);

        long GetLivingCount();

        ICollection<KeyValuePair<T, long>> GetCounts();
    }
}
