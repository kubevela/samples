// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Fireworks.Worker
{
    using System.Threading;
    using Microsoft.ServiceFabricMesh.Fireworks.Common;

    class Program
    {
        static void Main(string[] args)
        {
            var pingClient = new PingClient();
            pingClient.SendPingAsync(CancellationToken.None).Wait();
        }
    }
}
