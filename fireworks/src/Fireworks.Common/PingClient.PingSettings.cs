// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Fireworks.Common
{
    using System;

    public partial class PingClient
    {
        public class PingSettings
        {
            private const string PING_INTERVAL_MILLIS = "PING_INTERVAL_MILLIS";
            private const string PING_FAILURE_RETRY_INTERVAL_MILLIS = "PING_FAILURE_RETRY_INTERVAL_MILLIS";
            private const string PING_FUZZ_INTERVAL_MILLIS = "PING_FUZZ_INTERVAL_MILLIS";

            public PingSettings(
                int pingIntervalMillis, 
                int pingFailureRetryIntervalMillis, 
                int pingFuzzIntervalMillis)
            {
                this.PingFuzzIntervalMillis = pingFuzzIntervalMillis;
                this.PingFailureRetryIntervalMillis = pingFailureRetryIntervalMillis;
                this.PingIntervalMillis = pingIntervalMillis;
            }

            public int PingIntervalMillis { get; private set; }

            public int PingFailureRetryIntervalMillis { get; private set; }

            public int PingFuzzIntervalMillis { get; private set; }

            public static PingSettings FromEnvironment()
            {
                if (!int.TryParse(Environment.GetEnvironmentVariable(PING_INTERVAL_MILLIS), out int pingIntervalMillis))
                {
                    pingIntervalMillis = 5000;
                }

                if (!int.TryParse(Environment.GetEnvironmentVariable(PING_FUZZ_INTERVAL_MILLIS), out int pingFuzzIntervalMillis))
                {
                    pingFuzzIntervalMillis = 2000;
                }

                if (!int.TryParse(Environment.GetEnvironmentVariable(PING_FAILURE_RETRY_INTERVAL_MILLIS), out int pingFailureRetryIntervalMillis))
                {
                    pingFailureRetryIntervalMillis = 1000;
                }

                return new PingSettings(
                    pingIntervalMillis, 
                    pingFailureRetryIntervalMillis, 
                    pingFuzzIntervalMillis);
            }
        }
    }
}

