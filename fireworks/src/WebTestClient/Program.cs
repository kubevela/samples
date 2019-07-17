// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace WebTestClient
{
    using System;
    using System.Collections.Generic;
    using System.Threading;
    using System.Threading.Tasks;
    using Microsoft.ServiceFabricMesh.Fireworks.Common;

    class Program
    {
        static Random Rand = new Random();

        static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("dotnet WebTestClient.dll <counterAddress> <maxObjectCount> [scaleupTime (60 seconds)] [objectVersion (v1)]");
                return -1;
            }

            var counterAddress = args[0];
            var maxObjectCount = int.Parse(args[1]);
            var scaleupTimeSeconds = 60;
            var objectVersion = "v1";

            if (args.Length > 2)
            {
                scaleupTimeSeconds = int.Parse(args[2]);    
            }

            if (args.Length > 3)
            {
                objectVersion = args[3];
            }

            var initialObjects = new List<Task>();
            var initialCts = new CancellationTokenSource();

            Console.WriteLine("Creating one red, one blue and one green objects ...");

            initialObjects.AddRange(CreateObjects(counterAddress, "red", objectVersion, 1, 0, initialCts.Token));
            initialObjects.AddRange(CreateObjects(counterAddress, "blue", objectVersion, 1, 0, initialCts.Token));
            initialObjects.AddRange(CreateObjects(counterAddress, "green", objectVersion, 1, 0, initialCts.Token));

            var done = false;
            List<Task> scaledupObjects = null;
            CancellationTokenSource scaledupCts = null;

            while (!done)
            {
                Console.WriteLine();
                Console.WriteLine("Press enter to scale up or down, ctrl-c to exit.");
                Console.ReadLine();

                if (scaledupObjects != null)
                {
                    Console.WriteLine("Scaling down ..");
                    scaledupCts.Cancel();

                    WaitForTaskCompletion(scaledupObjects);
                    scaledupObjects = null;
                    scaledupCts = null;
                }
                else
                {
                    Console.WriteLine("Scaling up ..");
                    scaledupObjects = new List<Task>();
                    scaledupCts = new CancellationTokenSource();
                    
                    scaledupObjects.AddRange(CreateObjects(counterAddress, "red", objectVersion, maxObjectCount-1, scaleupTimeSeconds, scaledupCts.Token));
                    scaledupObjects.AddRange(CreateObjects(counterAddress, "blue", objectVersion, maxObjectCount-1, scaleupTimeSeconds, scaledupCts.Token));
                    scaledupObjects.AddRange(CreateObjects(counterAddress, "green", objectVersion, maxObjectCount-1, scaleupTimeSeconds, scaledupCts.Token));
                }
            }

            return 0;
        }

        static void WaitForTaskCompletion(List<Task> tasks)
        {
            foreach(var t in tasks)
            {
                try
                {
                    t.Wait();
                }
                catch { }
            }
        }

        static List<Task> CreateObjects(
            string objectCounterAddress,
            string objectType,
            string objectVersion,
            int objectCount,
            int maxDelaySeconds,
            CancellationToken cancellationToken)
        {
            var tasks = new List<Task>();

            for(int i = 0; i < objectCount; i ++)
            {
                var objInfo = new PingClient.ObjectInfo(objectType, objectVersion, Guid.NewGuid().ToString());
                var delayMillis = Rand.Next(maxDelaySeconds * 1000);

                tasks.Add(PingAsync(objectCounterAddress, objInfo, delayMillis, cancellationToken));
            }

            return tasks;
        }

        static async Task PingAsync(
            string objectCounterAddress, 
            PingClient.ObjectInfo objInfo, 
            int delayMillis, 
            CancellationToken cancellationToken)
        {
            await Task.Delay(delayMillis);

            var client = new PingClient(
                objectCounterAddress,
                objInfo,
                PingClient.PingSettings.FromEnvironment());

            await client.SendPingAsync(cancellationToken);
        }
    }
}

