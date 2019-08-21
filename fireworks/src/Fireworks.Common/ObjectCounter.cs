// ------------------------------------------------------------
//  Copyright (c) Microsoft Corporation.  All rights reserved.
//  Licensed under the MIT License (MIT). See License.txt in the repo root for license information.
// ------------------------------------------------------------

namespace Microsoft.ServiceFabricMesh.Samples.Fireworks.Common
{
    using System;
    using System.Collections.Concurrent;
    using System.Text;
    using System.Threading;

    public class ObjectCounter : IObjectCounter, IDisposable
    {
        private readonly ConcurrentDictionary<string, ILivenessCounter<string>> counts;
        private readonly Timer refreshTimer;
        private readonly TimeSpan refreshInterval;
        private readonly int expirationIntervalInSeconds;
        private readonly int fuzzIntervalInSeconds;
        private readonly int maxCountOutputLimit;

        private string currentJson;
        private bool disposedValue = false; 

        public ObjectCounter(
            int expirationIntervalInSeconds = 30,
            int fuzzIntervalInSeconds = 5,
            long refreshIntervalInMillis = 50,
            int maxCountOutputLimit = -1)
        {
            this.expirationIntervalInSeconds = expirationIntervalInSeconds;
            this.fuzzIntervalInSeconds = fuzzIntervalInSeconds;
            this.maxCountOutputLimit = maxCountOutputLimit;
            this.counts = new ConcurrentDictionary<string, ILivenessCounter<string>>();
            this.currentJson = "[]";
            this.refreshInterval = TimeSpan.FromMilliseconds(refreshIntervalInMillis);
            this.refreshTimer = new Timer(
                new TimerCallback(this.RefreshJson),
                null,
                refreshInterval,
                refreshInterval);
        }

        public void CountObject(string id, string type, string version)
        {
            var key = GetTypeVersionKey(type, version);
           
            var livenessCounter = this.counts.GetOrAdd(
                key,
                (k) =>
                {
                    return new LivenessCounter<string>(this.expirationIntervalInSeconds, this.fuzzIntervalInSeconds);
                });

            livenessCounter.ReportAlive(id);
        }

        public string GetCountsJson()
        {
            return this.currentJson;
        }

        public TimeSpan RefreshInterval
        {
            get
            {
                return this.refreshInterval;
            }
        }

        public void Dispose()
        {
            Dispose(true);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    if (this.refreshTimer != null)
                    {
                        this.refreshTimer.Dispose();
                    }
                }

                disposedValue = true;
            }
        }

        private static string GetTypeVersionKey(string type, string version)
        {
            return $"\"type\": \"{type}\", \"version\": \"{version}\"";
        }

        private void RefreshJson(object state)
        {
            var keys = this.counts.Keys;
            if (keys.Count > 0)
            {

                var sb = new StringBuilder();
                sb.Append("[");
                foreach (var key in keys)
                {
                    sb.Append("{");
                    sb.Append(key);
                    sb.Append(", \"counts\": ");
                    var count = counts[key].GetLivingCount();
                    if ((this.maxCountOutputLimit != -1) && (count > this.maxCountOutputLimit))
                    {
                        count = this.maxCountOutputLimit;
                    }

                    sb.Append(count);
                    sb.Append(" },");
                }
                sb.Remove(sb.Length - 1, 1);
                sb.Append("]");
                this.currentJson = sb.ToString();
            }
            else
            {
                this.currentJson = "[]";
            }
        }
    }
}
